"""v3.0.0 behaviour tests against an in-memory DynamoDB (moto).

Covers:
- membership lifecycle: queued renewals, roll (pending → active → expired),
  freeze/unfreeze day accounting, deactivate → frozen, lapsed students;
- Caja settlement: balance, fiado (debts), "Público general" rules, no
  double-counted income when paying memberships with balance;
- cash cut periods spanning days (no reset at midnight);
- birthday helper.
"""

from datetime import UTC, date, datetime, timedelta

import pytest

from src.models.balance import BalanceMovementType
from src.models.common import mexico_today
from src.models.membership import (
    FreezeMembershipRequest,
    MembershipCreate,
    MembershipStatus,
    MembershipUpdate,
)
from src.models.student import StudentCreate, StudentStatus, is_birthday
from src.models.transaction import (
    CashCutCreate,
    ChargeCreate,
    PaymentMethod,
    TransactionCreate,
    TransactionDynamoItem,
    TransactionType,
)
from src.repositories.balance_repository import BalanceRepository
from src.repositories.debt_repository import DebtRepository
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository
from src.repositories.transaction_repository import TransactionRepository
from src.services.debt_service import DebtService
from src.services.membership_service import MembershipService
from src.services.settlement_service import ChargeRequest, PaymentSettlementService
from src.services.student_service import StudentService
from src.services.transaction_service import TransactionService
from src.utils.exceptions import InvalidOperationException

pytestmark = pytest.mark.usefixtures("dynamo")


TODAY = mexico_today()


def _days(n: int) -> date:
    return TODAY + timedelta(days=n)


def _student(name: str = "Ana", status: StudentStatus = StudentStatus.ACTIVE) -> str:
    item = StudentRepository().create(
        StudentCreate(
            first_name=name,
            last_name="Prueba",
            email=f"{name.lower()}@test.mx",
            status=status,
        )
    )
    return item.student_id


def _membership(student_id: str, start: int, end: int, **kwargs: object) -> MembershipCreate:
    data: dict[str, object] = {
        "student_id": student_id,
        "membership_type": "room_elite",
        "start_date": _days(start),
        "end_date": _days(end),
        "price_paid": 0,
    }
    data.update(kwargs)
    return MembershipCreate(**data)  # type: ignore[arg-type]


def _statuses(student_id: str) -> dict[str, str]:
    return {
        m.membership_id: m.status
        for m in MembershipRepository().list_all_for_student(student_id)
    }


# ---------------------------------------------------------------------------
# Membership lifecycle
# ---------------------------------------------------------------------------


class TestQueuedRenewal:
    def test_early_renewal_is_queued_not_cancelled(self) -> None:
        sid = _student()
        svc = MembershipService()
        current = svc.assign_membership(_membership(sid, -10, 20))
        renewal = svc.assign_membership(_membership(sid, 0, 30))

        assert current.status == MembershipStatus.ACTIVE
        assert renewal.status == MembershipStatus.PENDING
        assert renewal.start_date == _days(20)  # starts when the current one ends
        assert renewal.end_date == _days(50)  # duration preserved
        assert renewal.days_until_start == 20
        statuses = _statuses(sid)
        assert statuses[current.membership_id] == "active"
        assert "cancelled" not in statuses.values()

    def test_second_renewal_queues_after_the_first(self) -> None:
        sid = _student()
        svc = MembershipService()
        svc.assign_membership(_membership(sid, -10, 20))
        svc.assign_membership(_membership(sid, 0, 30))
        third = svc.assign_membership(_membership(sid, 0, 30))
        assert third.start_date == _days(50)
        assert third.status == MembershipStatus.PENDING

    def test_future_start_without_current_membership_is_pending(self) -> None:
        sid = _student()
        m = MembershipService().assign_membership(_membership(sid, 5, 35))
        assert m.status == MembershipStatus.PENDING
        assert m.start_date == _days(5)

    def test_renewal_after_expiry_is_active_and_expires_the_old_one(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        old = repo.create(_membership(sid, -40, -10))  # stale "active" record
        new = MembershipService().assign_membership(_membership(sid, 0, 30))
        assert new.status == MembershipStatus.ACTIVE
        assert _statuses(sid)[old.membership_id] == "expired"

    def test_duo_both_partners_are_queued(self) -> None:
        a, b = _student("Ana"), _student("Beto")
        svc = MembershipService()
        svc.assign_membership(_membership(b, -5, 10))
        primary = svc.assign_membership(
            _membership(a, 0, 30, membership_type="room_duo", duo_partner_id=b)
        )
        assert primary.status == MembershipStatus.PENDING
        assert primary.start_date == _days(10)
        partner_pending = MembershipRepository().list_pending_for_student(b)
        assert len(partner_pending) == 1
        assert partner_pending[0].start_date == _days(10).isoformat()


class TestRoll:
    def test_pending_becomes_active_when_previous_ends(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        old = repo.create(_membership(sid, -30, 0))  # ends today (exclusive end)
        queued = repo.create(_membership(sid, 0, 30), status=MembershipStatus.PENDING)

        MembershipService().roll_student(sid)

        statuses = _statuses(sid)
        assert statuses[old.membership_id] == "expired"
        assert statuses[queued.membership_id] == "active"
        active = repo.get_active_for_student(sid)
        assert active is not None and active.membership_id == queued.membership_id

    def test_pending_is_not_promoted_while_frozen(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        frozen = repo.create(_membership(sid, -30, 0))
        repo.freeze(sid, frozen.membership_id, days=None)
        queued = repo.create(_membership(sid, 0, 30), status=MembershipStatus.PENDING)

        MembershipService().roll_student(sid)
        assert _statuses(sid)[queued.membership_id] == "pending"

    def test_roll_all_expires_finished_memberships(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        repo.create(_membership(sid, -40, -1))
        result = MembershipService().roll_all()
        assert result == {"students": 1, "changed": 1}
        assert list(_statuses(sid).values()) == ["expired"]

    def test_fixed_freeze_ends_automatically(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        m = repo.create(_membership(sid, -20, 10))
        repo.update_item(
            f"STUDENT#{sid}",
            f"MEMBERSHIP#{m.membership_id}",
            {
                "status": "frozen",
                "is_frozen": True,
                "freeze_start_date": _days(-7).isoformat(),
                "freeze_end_date": _days(-2).isoformat(),
                "GSI3SK": f"INACTIVE_MEMBERSHIP#{m.membership_id}",
            },
        )
        MembershipService().roll_student(sid)
        updated = repo.get_by_id(sid, m.membership_id)
        assert updated.status == "active"
        assert updated.end_date == _days(10).isoformat()  # planned == actual days


class TestFreezeAccounting:
    def test_indefinite_freeze_credits_actual_days(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        m = repo.create(_membership(sid, -10, 20))
        repo.freeze(sid, m.membership_id, days=None)
        item, delta = repo.unfreeze(sid, m.membership_id, effective_date=_days(12))
        assert delta == 12
        assert item.end_date == _days(32).isoformat()
        assert item.status == "active"

    def test_legacy_365_day_suspension_is_corrected_on_unfreeze(self) -> None:
        sid = _student()
        repo = MembershipRepository()
        m = repo.create(_membership(sid, -10, 20))
        repo.freeze(sid, m.membership_id, days=365)  # what v2.x suspend did
        item, delta = repo.unfreeze(sid, m.membership_id, effective_date=_days(5))
        assert delta == 5 - 365
        assert item.end_date == _days(25).isoformat()
        assert item.frozen_days_accumulated == 5

    def test_freeze_shifts_the_queue(self) -> None:
        sid = _student()
        svc = MembershipService()
        current = svc.assign_membership(_membership(sid, -10, 20))
        svc.assign_membership(_membership(sid, 0, 30))
        svc.freeze_membership(sid, current.membership_id, FreezeMembershipRequest(days=10))
        pending = MembershipRepository().list_pending_for_student(sid)
        assert pending[0].start_date == _days(30).isoformat()
        assert pending[0].end_date == _days(60).isoformat()

    def test_editing_pending_start_date_keeps_queue_index(self) -> None:
        sid = _student()
        svc = MembershipService()
        svc.assign_membership(_membership(sid, -10, 20))
        queued = svc.assign_membership(_membership(sid, 0, 30))
        svc.update_membership(
            sid, queued.membership_id, MembershipUpdate(start_date=_days(25), end_date=_days(55))
        )
        pending = MembershipRepository().list_pending_for_student(sid)
        assert pending[0].start_date == _days(25).isoformat()

    def test_cancelled_status_is_rejected(self) -> None:
        from fastapi import HTTPException

        sid = _student()
        svc = MembershipService()
        m = svc.assign_membership(_membership(sid, -10, 20))
        with pytest.raises(HTTPException):
            svc.update_membership(
                sid, m.membership_id, MembershipUpdate(status=MembershipStatus.CANCELLED)
            )


class TestStudentCascades:
    def test_deactivate_freezes_and_activate_unfreezes(self) -> None:
        sid = _student()
        m = MembershipService().assign_membership(_membership(sid, -10, 20))
        students = StudentService()

        students.deactivate_student(sid)
        frozen = MembershipRepository().get_by_id(sid, m.membership_id)
        assert frozen.status == "frozen"
        assert frozen.freeze_end_date is None
        assert frozen.end_date == _days(20).isoformat()  # not extended yet

        students.activate_student(sid)
        active = MembershipRepository().get_by_id(sid, m.membership_id)
        assert active.status == "active"
        assert active.end_date == _days(20).isoformat()  # 0 days frozen

    def test_suspend_no_longer_adds_365_days(self) -> None:
        sid = _student()
        m = MembershipService().assign_membership(_membership(sid, -10, 20))
        students = StudentService()
        students.suspend_student(sid)
        students.unsuspend_student(sid)
        assert MembershipRepository().get_by_id(sid, m.membership_id).end_date == (
            _days(20).isoformat()
        )


class TestLapsedStudents:
    def test_only_non_inactive_students_without_current_membership(self) -> None:
        svc = MembershipService()
        repo = MembershipRepository()
        active = _student("Activo")
        svc.assign_membership(_membership(active, -5, 25))
        expired = _student("Vencido")
        repo.create(_membership(expired, -40, -10))
        _student("Inactivo", status=StudentStatus.INACTIVE)
        never = _student("Nunca")
        frozen = _student("Congelado")
        fm = repo.create(_membership(frozen, -5, 25))
        repo.freeze(frozen, fm.membership_id, days=None)
        queued = _student("Encolado")
        repo.create(_membership(queued, 3, 33), status=MembershipStatus.PENDING)

        lapsed = svc.list_lapsed_students()
        ids = [r.student_id for r in lapsed]
        assert ids == [expired, never]  # most recent expiry first, never-had last
        assert lapsed[0].days_since_expiry == 10
        assert lapsed[1].last_end_date is None


# ---------------------------------------------------------------------------
# Caja settlement
# ---------------------------------------------------------------------------


def _deposit(student_id: str, amount: float) -> None:
    BalanceRepository().upsert_balance(student_id, amount)


class TestSettlement:
    def test_balance_plus_cash(self) -> None:
        sid = _student()
        _deposit(sid, 300)
        result = PaymentSettlementService().settle(
            ChargeRequest(
                student_id=sid,
                amount=500,
                concept_type=TransactionType.OTHER,
                description="Toalla",
                balance_amount=300,
                payment_method="cash",
            )
        )
        assert result.balance_applied == 300
        assert result.amount_paid_now == 200
        tx = TransactionRepository().get_transaction(result.transaction_id or "")
        assert tx.amount == 200
        assert BalanceRepository().get_balance(sid).current_balance == 0
        movements, _ = BalanceRepository().list_movements_for_student(sid)
        assert movements[0].movement_type == BalanceMovementType.CHARGE_APPLY.value

    def test_fully_paid_with_balance_records_no_income(self) -> None:
        sid = _student()
        _deposit(sid, 500)
        result = PaymentSettlementService().settle(
            ChargeRequest(
                student_id=sid,
                amount=500,
                concept_type=TransactionType.PRODUCT,
                description="Proteína",
                balance_amount=500,
            )
        )
        assert result.transaction_id is None
        assert TransactionRepository().list_transactions_between(None, TODAY.isoformat()) == []

    def test_pending_creates_debt_for_any_concept(self) -> None:
        sid = _student()
        result = PaymentSettlementService().settle(
            ChargeRequest(
                student_id=sid,
                amount=250,
                concept_type=TransactionType.OTHER,
                description="Inscripción",
                payment_status="pending",
            )
        )
        assert result.transaction_id is None
        debts, _ = DebtRepository().list_for_student(sid)
        assert len(debts) == 1
        assert debts[0].to_response().concept_type == TransactionType.OTHER
        assert debts[0].to_response().description == "Inscripción"

    @pytest.mark.parametrize(
        ("status", "balance"), [("pending", 0.0), ("paid", 50.0)]
    )
    def test_publico_general_cannot_owe_or_use_balance(
        self, status: str, balance: float
    ) -> None:
        with pytest.raises(InvalidOperationException):
            PaymentSettlementService().settle(
                ChargeRequest(
                    student_id=None,
                    amount=100,
                    concept_type=TransactionType.PRODUCT,
                    description="Agua",
                    payment_status=status,  # type: ignore[arg-type]
                    balance_amount=balance,
                )
            )

    def test_publico_general_can_pay_now(self) -> None:
        result = TransactionService().register_charge(
            ChargeCreate(transaction_type=TransactionType.OTHER, amount=80)
        )
        assert result.transaction_id is not None

    def test_insufficient_balance(self) -> None:
        sid = _student()
        _deposit(sid, 10)
        with pytest.raises(InvalidOperationException, match="Saldo insuficiente"):
            PaymentSettlementService().settle(
                ChargeRequest(
                    student_id=sid,
                    amount=100,
                    concept_type=TransactionType.OTHER,
                    description="x",
                    balance_amount=50,
                )
            )

    def test_membership_with_balance_does_not_double_count_income(self) -> None:
        sid = _student()
        _deposit(sid, 400)
        m = MembershipService().assign_membership(
            _membership(sid, 0, 30, price_paid=1000, balance_amount=400, payment_method="card")
        )
        tx = TransactionRepository().find_by_reference_id(sid, m.membership_id)
        assert tx is not None
        assert tx.amount == 600
        assert tx.payment_method == PaymentMethod.CARD.value
        assert BalanceRepository().get_balance(sid).current_balance == 0

    def test_membership_left_as_debt(self) -> None:
        sid = _student()
        m = MembershipService().assign_membership(
            _membership(sid, 0, 30, price_paid=900, payment_status="pending")
        )
        assert TransactionRepository().find_by_reference_id(sid, m.membership_id) is None
        debts, _ = DebtRepository().list_for_student(sid)
        assert debts[0].amount == 900
        assert debts[0].reference_id == m.membership_id

    def test_membership_payment_failure_rolls_back(self) -> None:
        sid = _student()
        with pytest.raises(Exception):  # noqa: B017 — 400 from insufficient balance
            MembershipService().assign_membership(
                _membership(sid, 0, 30, price_paid=500, balance_amount=100)
            )
        assert MembershipRepository().list_all_for_student(sid) == []

    def test_pay_debt_with_balance_then_cash(self) -> None:
        sid = _student()
        PaymentSettlementService().settle(
            ChargeRequest(
                student_id=sid,
                amount=300,
                concept_type=TransactionType.MEMBERSHIP,
                description="Membresía",
                payment_status="pending",
            )
        )
        _deposit(sid, 100)
        from src.models.debt import PayDebtRequest

        paid = DebtService().pay_all_debts(
            sid, PayDebtRequest(payment_method="cash", use_balance=True)
        )
        assert len(paid) == 1
        assert DebtRepository().list_for_student(sid)[0] == []
        txs = TransactionRepository().list_transactions_between(None, TODAY.isoformat())
        assert [(t.amount, t.transaction_type) for t in txs] == [(200, "membership")]


# ---------------------------------------------------------------------------
# Cash cut periods
# ---------------------------------------------------------------------------


def _tx_on(day: date, amount: float, created_at: datetime) -> None:
    """Insert a transaction dated ``day`` (bypasses 'today' in from_create)."""
    item = TransactionDynamoItem.from_create(
        TransactionCreate(
            transaction_type=TransactionType.OTHER,
            amount=amount,
            payment_method=PaymentMethod.CASH,
        )
    )
    item = item.model_copy(
        update={
            "GSI1SK": f"DATE#{day.isoformat()}#{item.transaction_id}",
            "GSI2SK": f"TX#{day.isoformat()}#{item.transaction_id}",
            "transaction_date": day.isoformat(),
            "created_at": created_at,
            "updated_at": created_at,
        }
    )
    TransactionRepository().put_item(item.model_dump(mode="json"))


class TestCashCutPeriod:
    def test_register_accumulates_across_days_until_a_cut(self) -> None:
        now = datetime.now(UTC)
        _tx_on(_days(-2), 100, now - timedelta(days=2))
        _tx_on(_days(-1), 50, now - timedelta(days=1))
        svc = TransactionService()

        period = svc.get_open_period()
        assert period.grand_total == 150
        assert period.includes_previous_days is True
        assert period.last_cut_at is None

        cut = svc.create_cash_cut(CashCutCreate(cut_date=TODAY))
        assert cut.grand_total == 150
        assert cut.transaction_count == 2
        assert svc.get_open_period().grand_total == 0

        detail = svc.get_cash_cut(cut.cut_id)
        assert detail.transaction_count == 2
        assert len(detail.transactions) == 2

    def test_only_transactions_after_last_cut_are_open(self) -> None:
        svc = TransactionService()
        _tx_on(_days(-1), 100, datetime.now(UTC) - timedelta(days=1))
        svc.create_cash_cut(CashCutCreate(cut_date=TODAY))
        svc.record_transaction(
            TransactionCreate(
                transaction_type=TransactionType.PRODUCT,
                amount=40,
                payment_method=PaymentMethod.CARD,
            )
        )
        period = svc.get_open_period()
        assert period.grand_total == 40
        assert period.total_card == 40
        assert period.includes_previous_days is False
        summary = svc.get_today_summary("period")
        assert summary["grand_total"] == 40

        second = svc.create_cash_cut(CashCutCreate(cut_date=TODAY))
        assert second.grand_total == 40
        assert len(svc.get_cash_cut(second.cut_id).transactions) == 1


# ---------------------------------------------------------------------------
# Birthdays
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("birth", "today", "expected"),
    [
        (date(1990, 10, 27), date(2026, 10, 27), True),
        (date(1990, 10, 27), date(2026, 10, 28), False),
        (date(2000, 2, 29), date(2027, 2, 28), True),  # non-leap year
        (date(2000, 2, 29), date(2028, 2, 28), False),  # leap year → Feb 29
        (date(2000, 2, 29), date(2028, 2, 29), True),
    ],
)
def test_is_birthday(birth: date, today: date, expected: bool) -> None:
    assert is_birthday(birth, today) is expected
