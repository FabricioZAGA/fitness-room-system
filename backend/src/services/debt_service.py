"""Debt service — business logic for student debts (cargos pendientes / fiado)."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.debt import PayDebtRequest, StudentDebtDynamoItem, StudentDebtResponse
from src.models.transaction import PaymentMethod, TransactionType
from src.repositories.balance_repository import BalanceRepository
from src.repositories.debt_repository import DebtRepository
from src.repositories.transaction_repository import TransactionRepository
from src.services.settlement_service import ChargeRequest, PaymentSettlementService
from src.utils.exceptions import InvalidOperationException

logger = Logger()


class DebtService:
    """Service for student debt operations."""

    def __init__(
        self,
        debt_repo: DebtRepository | None = None,
        transaction_repo: TransactionRepository | None = None,
        balance_repo: BalanceRepository | None = None,
        settlement: PaymentSettlementService | None = None,
    ) -> None:
        self._debt_repo = debt_repo or DebtRepository()
        self._transaction_repo = transaction_repo or TransactionRepository()
        self._balance_repo = balance_repo or BalanceRepository()
        self._settlement = settlement or PaymentSettlementService(
            transaction_repo=self._transaction_repo,
            debt_repo=self._debt_repo,
            balance_repo=self._balance_repo,
        )

    def list_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[StudentDebtResponse], dict[str, Any] | None]:
        """List all pending debts for a student.

        Args:
            student_id: The student's unique identifier.
            limit: Maximum number of results.
            last_evaluated_key: Pagination token.

        Returns:
            Tuple of (debt list, next page token).
        """
        items, next_key = self._debt_repo.list_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def list_all_pending(
        self,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[StudentDebtResponse], dict[str, Any] | None]:
        """List all pending debts across all students.

        Args:
            limit: Maximum number of results.
            last_evaluated_key: Pagination token.

        Returns:
            Tuple of (debt list, next page token).
        """
        items, next_key = self._debt_repo.list_all_pending(
            limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def pay_debt(
        self,
        student_id: str,
        sale_id: str,
        data: PayDebtRequest,
    ) -> StudentDebtResponse:
        """Pay a debt with cash / card / transfer / mixed and/or the student's balance.

        Steps:
        1. Get the debt record.
        2. Settle the payment (balance movement and/or Transaction).
        3. Delete the debt record.

        Args:
            student_id: The student's unique identifier.
            sale_id: The debt identifier.
            data: Payment details.

        Returns:
            The debt that was paid (for confirmation).
        """
        logger.info(
            "Paying student debt",
            extra={"student_id": student_id, "sale_id": sale_id},
        )
        debt = self._debt_repo.get_debt(student_id, sale_id)
        balance_amount = 0.0
        if data.use_balance:
            available = self._balance_repo.get_balance(student_id).current_balance
            balance_amount = round(min(max(available, 0.0), debt.amount), 2)
        self._pay(debt, data, balance_amount)
        return debt.to_response()

    def pay_all_debts(
        self,
        student_id: str,
        data: PayDebtRequest,
    ) -> list[StudentDebtResponse]:
        """Pay all pending debts for a student at once.

        The balance (if requested) is consumed debt by debt until exhausted; the
        rest is paid with the selected method. Mixed payments must be done debt
        by debt because each breakdown has to match its own amount.

        Args:
            student_id: The student's unique identifier.
            data: Payment details (method applies to all).

        Returns:
            List of debts that were paid.
        """
        if data.payment_method == PaymentMethod.MIXED.value:
            raise InvalidOperationException(
                "El pago mixto se registra adeudo por adeudo."
            )
        debts, _ = self._debt_repo.list_for_student(student_id, limit=100)
        available = (
            self._balance_repo.get_balance(student_id).current_balance
            if data.use_balance
            else 0.0
        )
        paid: list[StudentDebtResponse] = []
        for debt in debts:
            balance_amount = round(min(max(available, 0.0), debt.amount), 2)
            self._pay(debt, data, balance_amount)
            available -= balance_amount
            paid.append(debt.to_response())
        return paid

    def _pay(
        self, debt: StudentDebtDynamoItem, data: PayDebtRequest, balance_amount: float
    ) -> None:
        """Settle a single debt and remove it."""
        response = debt.to_response()
        concept = f"Cobro adeudo: {response.description}"
        if response.concept_type == TransactionType.PRODUCT:
            concept += f" x{debt.quantity}"
        self._settlement.settle(
            ChargeRequest(
                student_id=debt.student_id,
                amount=debt.amount,
                concept_type=response.concept_type,
                description=data.notes or concept,
                reference_id=debt.reference_id or debt.sale_id,
                payment_status="paid",
                balance_amount=balance_amount,
                payment_method=data.payment_method,
                payment_splits=data.payment_splits,
            )
        )
        self._debt_repo.delete_debt(debt.student_id, debt.sale_id)
        logger.info(
            "Debt paid and cleared",
            extra={
                "student_id": debt.student_id,
                "sale_id": debt.sale_id,
                "amount": debt.amount,
                "balance_applied": balance_amount,
            },
        )
