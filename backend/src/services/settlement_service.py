"""Payment settlement service — single place that decides how a Caja charge is paid.

Every charge (product sale, membership, class pack or "other") can be:

- paid now with cash / card / transfer / mixed → a Transaction is recorded;
- partially or fully covered with the student's balance (saldo a favor) → a
  ``charge_apply`` balance movement is recorded and **no** Transaction is created
  for that portion, because the money already entered the register when it was
  deposited (avoids double-counting income);
- left unpaid ("dejar a deber" / fiado) → a StudentDebt is recorded and the
  Transaction is created later, when the debt is paid.

Anonymous charges ("Público general", ``student_id=None``) are only allowed when
paid in full right away.
"""

from dataclasses import dataclass, replace
from typing import Literal

from aws_lambda_powertools import Logger

from src.models.balance import BalanceMovementType
from src.models.common import new_id
from src.models.transaction import (
    PaymentMethod,
    PaymentSplit,
    TransactionCreate,
    TransactionType,
    validate_payment_splits,
)
from src.repositories.balance_repository import BalanceRepository
from src.repositories.debt_repository import DebtRepository
from src.repositories.transaction_repository import TransactionRepository
from src.utils.exceptions import InvalidOperationException

logger = Logger()

PaymentStatus = Literal["paid", "pending"]

_MONEY_TOLERANCE = 0.005


@dataclass(frozen=True)
class ChargeRequest:
    """A charge to settle.

    Attributes:
        student_id: Buyer; ``None`` = "Público general".
        amount: Total amount of the charge (MXN).
        concept_type: What is being charged (membership, product, ...).
        description: Human-readable concept (shown in debts and transactions).
        reference_id: membership_id / sale_id / ... the charge belongs to.
        payment_status: ``paid`` (now) or ``pending`` (fiado).
        balance_amount: Portion covered with the student's balance.
        payment_method: Method for the portion paid now.
        payment_splits: Breakdown when ``payment_method`` is ``mixed``.
        quantity: Units (products only, informative).
        product_id: Product sold (products only, kept on debts for compatibility).
    """

    student_id: str | None
    amount: float
    concept_type: TransactionType
    description: str
    reference_id: str | None = None
    payment_status: PaymentStatus = "paid"
    balance_amount: float = 0.0
    payment_method: str = PaymentMethod.CASH.value
    payment_splits: list[PaymentSplit] | None = None
    quantity: int = 1
    product_id: str = ""

    @property
    def due_now(self) -> float:
        """Amount collected now with cash / card / transfer."""
        if self.payment_status == "pending":
            return 0.0
        return round(self.amount - self.balance_amount, 2)


@dataclass(frozen=True)
class SettlementResult:
    """Outcome of settling a charge."""

    transaction_id: str | None
    debt_id: str | None
    balance_applied: float
    amount_paid_now: float
    reference_id: str | None = None


class PaymentSettlementService:
    """Apply balance, record transactions or create debts for a charge."""

    def __init__(
        self,
        transaction_repo: TransactionRepository | None = None,
        debt_repo: DebtRepository | None = None,
        balance_repo: BalanceRepository | None = None,
    ) -> None:
        self._transactions = transaction_repo or TransactionRepository()
        self._debts = debt_repo or DebtRepository()
        self._balances = balance_repo or BalanceRepository()

    # ------------------------------------------------------------------
    # Validation (call before any side effect, e.g. stock decrement)
    # ------------------------------------------------------------------

    def validate(self, charge: ChargeRequest) -> list[PaymentSplit] | None:
        """Validate a charge without writing anything.

        Returns:
            The normalized payment splits for the portion paid now.

        Raises:
            InvalidOperationException: If the charge cannot be settled as requested.
        """
        if charge.amount < 0:
            raise InvalidOperationException("El monto del cobro no puede ser negativo.")
        if charge.balance_amount < 0:
            raise InvalidOperationException("El saldo a aplicar no puede ser negativo.")
        if charge.balance_amount - charge.amount > _MONEY_TOLERANCE:
            raise InvalidOperationException("El saldo aplicado no puede exceder el total.")

        needs_student = charge.payment_status == "pending" or charge.balance_amount > 0
        if needs_student and not charge.student_id:
            raise InvalidOperationException(
                "Para dejar a deber o pagar con saldo hay que seleccionar un alumno "
                "(no se permite 'Público general')."
            )

        if charge.payment_status == "pending":
            if charge.balance_amount > 0:
                raise InvalidOperationException(
                    "Un cobro pendiente (fiado) no puede usar saldo al mismo tiempo."
                )
            return None

        if charge.balance_amount > 0 and charge.student_id:
            current = self._balances.get_balance(charge.student_id).current_balance
            if charge.balance_amount - current > _MONEY_TOLERANCE:
                raise InvalidOperationException(
                    f"Saldo insuficiente: tiene ${current:,.2f}, "
                    f"se requieren ${charge.balance_amount:,.2f}."
                )

        if charge.due_now <= 0:
            return None
        try:
            return validate_payment_splits(
                charge.payment_method, charge.due_now, charge.payment_splits
            )
        except ValueError as exc:
            raise InvalidOperationException(str(exc)) from exc

    # ------------------------------------------------------------------
    # Settlement
    # ------------------------------------------------------------------

    def settle(self, charge: ChargeRequest) -> SettlementResult:
        """Validate and settle a charge.

        Order of writes: debt **or** (balance movement → transaction). The balance
        is debited before the transaction so a failure never leaves income
        recorded without the balance being consumed.
        """
        splits = self.validate(charge)
        if charge.amount <= 0:
            return SettlementResult(None, None, 0.0, 0.0)
        # Every record of this charge (debt, balance movement, transaction) shares
        # one reference so the account statement can show them as a single line.
        if charge.reference_id is None:
            charge = replace(charge, reference_id=new_id())

        if charge.payment_status == "pending" and charge.student_id:
            # The debt ID is the charge reference (sale_id for products — legacy
            # behaviour — membership_id for memberships, generated otherwise).
            debt = self._debts.create_debt(
                student_id=charge.student_id,
                sale_id=charge.reference_id or new_id(),
                amount=charge.amount,
                description=charge.description,
                concept_type=charge.concept_type,
                product_id=charge.product_id,
                quantity=charge.quantity,
                reference_id=charge.reference_id,
            )
            logger.info(
                "Charge left as debt",
                extra={
                    "student_id": charge.student_id,
                    "debt_id": debt.sale_id,
                    "concept": charge.concept_type.value,
                    "amount": charge.amount,
                },
            )
            return SettlementResult(None, debt.sale_id, 0.0, 0.0, charge.reference_id)

        balance_applied = 0.0
        if charge.balance_amount > 0 and charge.student_id:
            balance_applied = round(charge.balance_amount, 2)
            self.apply_balance(
                student_id=charge.student_id,
                amount=balance_applied,
                reference_id=charge.reference_id,
                notes=f"Pago con saldo: {charge.description}",
                concept_type=charge.concept_type,
            )

        transaction_id: str | None = None
        due_now = charge.due_now
        if due_now > 0:
            try:
                method = PaymentMethod(charge.payment_method)
            except ValueError:
                method = PaymentMethod.CASH
            notes = charge.description
            if balance_applied > 0:
                notes = f"{notes} (saldo aplicado ${balance_applied:,.2f})"
            tx = self._transactions.create_transaction(
                TransactionCreate(
                    student_id=charge.student_id,
                    transaction_type=charge.concept_type,
                    amount=due_now,
                    payment_method=method,
                    payment_splits=splits,
                    reference_id=charge.reference_id,
                    notes=notes[:500],
                )
            )
            transaction_id = tx.transaction_id

        return SettlementResult(
            transaction_id, None, balance_applied, max(due_now, 0.0), charge.reference_id
        )

    def apply_balance(
        self,
        student_id: str,
        amount: float,
        reference_id: str | None,
        notes: str,
        concept_type: TransactionType | None = None,
    ) -> float:
        """Debit ``amount`` from a student's balance and record the movement.

        Returns:
            The balance after the debit.

        Raises:
            InvalidOperationException: If the balance is insufficient.
        """
        current = self._balances.get_balance(student_id).current_balance
        if amount - current > _MONEY_TOLERANCE:
            raise InvalidOperationException(
                f"Saldo insuficiente: tiene ${current:,.2f}, se requieren ${amount:,.2f}."
            )
        new_balance = round(max(current - amount, 0.0), 2)
        self._balances.upsert_balance(student_id, new_balance)
        self._balances.create_movement(
            student_id=student_id,
            amount=-amount,
            movement_type=BalanceMovementType.CHARGE_APPLY,
            balance_after=new_balance,
            reference_id=reference_id,
            notes=notes[:500],
            concept_type=concept_type.value if concept_type else None,
        )
        logger.info(
            "Balance applied to charge",
            extra={"student_id": student_id, "amount": amount, "balance_after": new_balance},
        )
        return new_balance
