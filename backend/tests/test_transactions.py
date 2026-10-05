"""Tests for mixed payments and period-based cash cuts."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from src.models.transaction import (
    CashCutCreate,
    CashCutDynamoItem,
    PaymentMethod,
    PaymentSplit,
    TransactionCreate,
    TransactionDynamoItem,
    TransactionType,
    TransactionUpdate,
    sum_by_method,
    validate_payment_splits,
)
from src.repositories.transaction_repository import TransactionRepository
from src.services.transaction_service import TransactionService
from src.utils.exceptions import InvalidOperationException

BASE_TIME = datetime(2026, 10, 5, 15, 0, tzinfo=UTC)


def make_tx(
    amount: float,
    method: str = "cash",
    splits: list[dict[str, Any]] | None = None,
    minutes: int = 0,
) -> TransactionDynamoItem:
    """Build a transaction item created ``minutes`` after BASE_TIME."""
    created = BASE_TIME + timedelta(minutes=minutes)
    return TransactionDynamoItem(
        PK="TRANSACTION#x",
        SK="METADATA",
        GSI1PK="TRANSACTIONS",
        GSI1SK="DATE#2026-10-05#x",
        GSI2PK="STUDENT#ANONYMOUS",
        GSI2SK="TX#2026-10-05#x",
        transaction_id=f"tx-{minutes}",
        student_id=None,
        transaction_type="other",
        amount=amount,
        payment_method=method,
        payment_splits=splits,
        reference_id=None,
        notes=None,
        transaction_date="2026-10-05",
        created_at=created,
        updated_at=created,
    )


def make_cut(minutes: int) -> CashCutDynamoItem:
    """Build a cash cut item created ``minutes`` after BASE_TIME."""
    return CashCutDynamoItem.from_data(
        CashCutCreate(cut_date=date(2026, 10, 5)),
        [],
        now=BASE_TIME + timedelta(minutes=minutes),
    )


class TestPaymentSplitValidation:
    """Validation rules for the mixed-payment breakdown."""

    def test_valid_mixed(self) -> None:
        splits = [
            PaymentSplit(method=PaymentMethod.CASH, amount=300),
            PaymentSplit(method=PaymentMethod.CARD, amount=500),
        ]
        assert validate_payment_splits("mixed", 800, splits) == splits

    def test_sum_mismatch(self) -> None:
        splits = [
            PaymentSplit(method=PaymentMethod.CASH, amount=300),
            PaymentSplit(method=PaymentMethod.CARD, amount=400),
        ]
        with pytest.raises(ValueError, match="no coincide"):
            validate_payment_splits("mixed", 800, splits)

    def test_requires_two_methods(self) -> None:
        with pytest.raises(ValueError, match="al menos dos"):
            validate_payment_splits(
                "mixed", 800, [PaymentSplit(method=PaymentMethod.CASH, amount=800)]
            )

    def test_duplicate_methods(self) -> None:
        splits = [
            PaymentSplit(method=PaymentMethod.CASH, amount=400),
            PaymentSplit(method=PaymentMethod.CASH, amount=400),
        ]
        with pytest.raises(ValueError, match="una vez"):
            validate_payment_splits("mixed", 800, splits)

    def test_non_mixed_drops_splits(self) -> None:
        splits = [PaymentSplit(method=PaymentMethod.CASH, amount=1)]
        assert validate_payment_splits("card", 800, splits) is None

    def test_split_cannot_be_mixed(self) -> None:
        with pytest.raises(ValidationError):
            PaymentSplit(method=PaymentMethod.MIXED, amount=10)

    def test_transaction_create_mixed_without_splits_fails(self) -> None:
        with pytest.raises(ValidationError):
            TransactionCreate(
                transaction_type=TransactionType.OTHER,
                amount=100,
                payment_method=PaymentMethod.MIXED,
            )


class TestAggregation:
    """Cash/card/transfer totals must split mixed payments correctly."""

    def test_sum_by_method_mixed_and_decimal(self) -> None:
        txs = [
            make_tx(100, "cash"),
            make_tx(50, "transfer"),
            make_tx(
                800,
                "mixed",
                [
                    {"method": "cash", "amount": Decimal("300")},
                    {"method": "card", "amount": Decimal("500")},
                ],
            ),
        ]
        assert sum_by_method(txs) == {"cash": 400.0, "card": 500.0, "transfer": 50.0}

    def test_cash_cut_totals_mixed(self) -> None:
        cut = CashCutDynamoItem.from_data(
            CashCutCreate(cut_date=date(2026, 10, 5)),
            [make_tx(800, "mixed", [{"method": "cash", "amount": 300},
                                    {"method": "card", "amount": 500}])],
        )
        assert (cut.total_cash, cut.total_card, cut.grand_total) == (300, 500, 800)


class TestCashCutPeriods:
    """A cash cut resets the register: later movements start a new period."""

    def _service(
        self, txs: list[TransactionDynamoItem], cuts: list[CashCutDynamoItem]
    ) -> tuple[TransactionService, MagicMock]:
        repo = MagicMock()
        repo.list_transactions_by_date.return_value = (txs, None)
        repo.list_cash_cuts_for_date.return_value = cuts
        repo.create_cash_cut.side_effect = (
            lambda data, transactions, period_start=None: CashCutDynamoItem.from_data(
                data, transactions, period_start=period_start
            )
        )
        return TransactionService(repo=repo), repo

    def test_first_cut_of_day_includes_everything(self) -> None:
        svc, repo = self._service([make_tx(100, minutes=1), make_tx(200, minutes=2)], [])
        result = svc.create_cash_cut(CashCutCreate(cut_date=date(2026, 10, 5)))
        assert result.grand_total == 300
        assert result.period_start is None
        repo.create_cash_cut.assert_called_once()

    def test_second_cut_only_includes_movements_after_first(self) -> None:
        first = make_cut(minutes=10)
        txs = [make_tx(100, minutes=5), make_tx(250, minutes=20)]
        svc, _ = self._service(txs, [first])
        result = svc.create_cash_cut(CashCutCreate(cut_date=date(2026, 10, 5)))
        assert result.grand_total == 250
        assert result.transaction_count == 1
        assert result.period_start == first.created_at

    def test_period_summary_resets_after_cut(self) -> None:
        txs = [make_tx(100, minutes=5), make_tx(40, "card", minutes=20)]
        svc, _ = self._service(txs, [make_cut(minutes=10)])
        with patch("src.services.transaction_service.mexico_today", return_value=date(2026, 10, 5)):
            period = svc.get_today_summary(scope="period")
            day = svc.get_today_summary(scope="day")
        assert period["grand_total"] == 40
        assert period["total_cash"] == 0
        assert period["last_cut_at"] is not None
        assert day["grand_total"] == 140

    def test_covers_respects_period_bounds(self) -> None:
        cut = CashCutDynamoItem.from_data(
            CashCutCreate(cut_date=date(2026, 10, 5)),
            [],
            period_start=BASE_TIME + timedelta(minutes=10),
            now=BASE_TIME + timedelta(minutes=30),
        )
        assert not cut.covers(make_tx(1, minutes=5))
        assert cut.covers(make_tx(1, minutes=20))
        assert not cut.covers(make_tx(1, minutes=40))

    def test_legacy_cut_covers_whole_day(self) -> None:
        legacy = make_cut(minutes=10).model_copy(update={"is_period_cut": False})
        assert legacy.covers(make_tx(1, minutes=40))


class TestUpdateMixedTransaction:
    """Updating a mixed transaction keeps the breakdown consistent."""

    def _repo(self, existing: TransactionDynamoItem) -> tuple[TransactionRepository, MagicMock]:
        repo = TransactionRepository.__new__(TransactionRepository)
        update_item = MagicMock(
            side_effect=lambda _pk, _sk, updates: {**existing.model_dump(), **updates}
        )
        repo.get_transaction = MagicMock(return_value=existing)  # type: ignore[method-assign]
        repo.update_item = update_item  # type: ignore[method-assign]
        return repo, update_item

    def test_amount_change_without_new_splits_is_rejected(self) -> None:
        existing = make_tx(800, "mixed", [{"method": "cash", "amount": 300},
                                          {"method": "card", "amount": 500}])
        repo, _ = self._repo(existing)
        with pytest.raises(InvalidOperationException):
            repo.update_transaction("tx-0", TransactionUpdate(amount=900))

    def test_switch_to_single_method_clears_splits(self) -> None:
        existing = make_tx(800, "mixed", [{"method": "cash", "amount": 300},
                                          {"method": "card", "amount": 500}])
        repo, update_item = self._repo(existing)
        result = repo.update_transaction(
            "tx-0", TransactionUpdate(payment_method=PaymentMethod.CARD)
        )
        assert update_item.call_args.args[2]["payment_splits"] is None
        assert result.amount_by_method()["card"] == 800

    def test_switch_to_mixed_with_splits(self) -> None:
        repo, update_item = self._repo(make_tx(800, "cash"))
        repo.update_transaction(
            "tx-0",
            TransactionUpdate(
                payment_method=PaymentMethod.MIXED,
                payment_splits=[
                    PaymentSplit(method=PaymentMethod.CASH, amount=200),
                    PaymentSplit(method=PaymentMethod.TRANSFER, amount=600),
                ],
            ),
        )
        sent = update_item.call_args.args[2]
        assert sent["payment_method"] == "mixed"
        assert sent["payment_splits"] == [
            {"method": "cash", "amount": 200.0},
            {"method": "transfer", "amount": 600.0},
        ]
