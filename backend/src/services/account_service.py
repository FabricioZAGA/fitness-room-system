"""Account service — builds the student account statement (estado de cuenta).

The statement answers, per student: *what did they buy, did they pay it, how,
and what do they still owe?* It is derived from three sources and never
written:

- Transactions (money received now: cash / card / transfer / mixed).
- Balance movements (deposits, and balance used to pay charges).
- Pending debts (charges left unpaid / fiado).

Lines are grouped by ``reference_id`` (membership_id, sale_id, debt id) so a
charge paid partly with balance and partly in cash — or a debt paid later — is
shown as a single line with its full history.
"""

import re

from aws_lambda_powertools import Logger

from src.models.account import (
    AccountEntry,
    AccountEntryKind,
    AccountEntryStatus,
    StudentAccountResponse,
)
from src.models.balance import BalanceMovementDynamoItem, BalanceMovementType
from src.models.debt import StudentDebtDynamoItem
from src.models.transaction import (
    PaymentMethod,
    PaymentSplit,
    TransactionDynamoItem,
    TransactionType,
)
from src.repositories.balance_repository import BalanceRepository
from src.repositories.debt_repository import DebtRepository
from src.repositories.transaction_repository import TransactionRepository

logger = Logger()

_PREFIXES = ("Pago con saldo: ", "Cobro adeudo: ", "Abono a cuenta: ")
_BALANCE_SUFFIX = re.compile(r"\s*\(saldo aplicado \$[\d,]+\.\d{2}\)$")
_BALANCE_CHARGE_TYPES = {
    BalanceMovementType.CHARGE_APPLY.value,
    BalanceMovementType.MEMBERSHIP_APPLY.value,
}


def _clean(description: str | None, fallback: str) -> str:
    """Strip settlement prefixes/suffixes so the concept reads naturally."""
    text = (description or "").strip()
    for prefix in _PREFIXES:
        if text.startswith(prefix):
            text = text[len(prefix):]
    text = _BALANCE_SUFFIX.sub("", text).strip()
    return text or fallback


def _concept(value: str | None) -> TransactionType | None:
    return TransactionType(value) if value and value in TransactionType._value2member_map_ else None


def _method(value: str | None) -> PaymentMethod | None:
    return PaymentMethod(value) if value and value in PaymentMethod._value2member_map_ else None


class AccountService:
    """Build account statements."""

    def __init__(
        self,
        transaction_repo: TransactionRepository | None = None,
        balance_repo: BalanceRepository | None = None,
        debt_repo: DebtRepository | None = None,
    ) -> None:
        self._transactions = transaction_repo or TransactionRepository()
        self._balances = balance_repo or BalanceRepository()
        self._debts = debt_repo or DebtRepository()

    def get_statement(self, student_id: str) -> StudentAccountResponse:
        """Full statement for a student, newest first."""
        transactions = self._transactions.list_all_for_student(student_id)
        movements = self._balances.list_all_movements_for_student(student_id)
        debts = self._debts.list_all_for_student(student_id)
        balance = self._balances.get_balance(student_id).current_balance

        entries = self._build_entries(transactions, movements, debts)
        entries.sort(key=lambda e: e.date, reverse=True)
        pending = [e for e in entries if e.status == AccountEntryStatus.PENDING]
        return StudentAccountResponse(
            student_id=student_id,
            current_balance=balance,
            total_pending=round(sum(e.pending_amount for e in pending), 2),
            pending_count=len(pending),
            entries=entries,
        )

    @staticmethod
    def _build_entries(
        transactions: list[TransactionDynamoItem],
        movements: list[BalanceMovementDynamoItem],
        debts: list[StudentDebtDynamoItem],
    ) -> list[AccountEntry]:
        entries: list[AccountEntry] = []
        deposits = [m for m in movements if m.movement_type == BalanceMovementType.DEPOSIT.value]
        deposit_ids = {m.movement_id for m in deposits}

        for m in deposits:
            entries.append(
                AccountEntry(
                    entry_id=m.movement_id,
                    kind=AccountEntryKind.DEPOSIT,
                    date=m.created_at,
                    description=_clean(m.notes, "Abono a cuenta"),
                    amount=m.amount,
                    paid_now=m.amount,
                    payment_method=_method(m.payment_method),
                )
            )

        groups: dict[str, AccountEntry] = {}

        def group(key: str, **defaults: object) -> AccountEntry:
            if key not in groups:
                groups[key] = AccountEntry(
                    entry_id=key, kind=AccountEntryKind.CHARGE, **defaults  # type: ignore[arg-type]
                )
            return groups[key]

        # 1. Money received now (skip the income record of deposits — shown above).
        for tx in transactions:
            if tx.reference_id in deposit_ids or (
                tx.reference_id is None and (tx.notes or "").startswith("Abono a cuenta")
            ):
                continue
            key = tx.reference_id or tx.transaction_id
            e = group(
                key,
                date=tx.created_at,
                concept_type=_concept(tx.transaction_type),
                description=_clean(tx.notes, tx.transaction_type),
                amount=0.0,
                reference_id=tx.reference_id,
            )
            e.amount = round(e.amount + tx.amount, 2)
            e.paid_now = round(e.paid_now + tx.amount, 2)
            e.payment_method = PaymentMethod(tx.payment_method)
            e.payment_splits = (
                [PaymentSplit.model_validate(s) for s in tx.payment_splits]
                if tx.payment_splits
                else None
            )
            if (tx.notes or "").startswith("Cobro adeudo"):
                e.paid_at = tx.created_at
            e.date = min(e.date, tx.created_at)

        # 2. Balance used to pay charges.
        for m in movements:
            if m.movement_type not in _BALANCE_CHARGE_TYPES:
                continue
            used = round(-m.amount, 2)
            key = m.reference_id or m.movement_id
            e = group(
                key,
                date=m.created_at,
                concept_type=_concept(m.concept_type),
                description=_clean(m.notes, "Pago con saldo"),
                amount=0.0,
                reference_id=m.reference_id,
            )
            e.paid_with_balance = round(e.paid_with_balance + used, 2)
            # Legacy (≤ v2.x) "membership_apply" movements coexisted with a
            # transaction for the FULL price, so they must not add to the total.
            if m.movement_type == BalanceMovementType.CHARGE_APPLY.value:
                e.amount = round(e.amount + used, 2)
            if e.concept_type is None:
                e.concept_type = _concept(m.concept_type)
            e.date = min(e.date, m.created_at)

        # 3. Still owed.
        for d in debts:
            key = d.reference_id or d.sale_id
            r = d.to_response()
            e = group(
                key,
                date=d.created_at,
                concept_type=r.concept_type,
                description=r.description,
                amount=0.0,
                reference_id=d.reference_id or d.sale_id,
            )
            e.amount = round(e.amount + d.amount, 2)
            e.pending_amount = round(e.pending_amount + d.amount, 2)
            e.status = AccountEntryStatus.PENDING
            e.debt_id = d.sale_id
            e.date = min(e.date, d.created_at)

        entries.extend(groups.values())
        return entries

