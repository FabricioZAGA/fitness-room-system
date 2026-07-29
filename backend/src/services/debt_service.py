"""Debt service — business logic for student debts (ventas pendientes / fiado)."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.debt import PayDebtRequest, StudentDebtResponse
from src.models.transaction import PaymentMethod, TransactionCreate, TransactionType
from src.repositories.debt_repository import DebtRepository
from src.repositories.transaction_repository import TransactionRepository

logger = Logger()


class DebtService:
    """Service for student debt operations."""

    def __init__(
        self,
        debt_repo: DebtRepository | None = None,
        transaction_repo: TransactionRepository | None = None,
    ) -> None:
        self._debt_repo = debt_repo or DebtRepository()
        self._transaction_repo = transaction_repo or TransactionRepository()

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
        """Mark a debt as paid.

        Steps:
        1. Get the debt record.
        2. Create a Transaction for the payment.
        3. Delete the debt record.

        Args:
            student_id: The student's unique identifier.
            sale_id: The sale ID associated with the debt.
            data: Payment details.

        Returns:
            The debt that was paid (for confirmation).
        """
        logger.info(
            "Paying student debt",
            extra={"student_id": student_id, "sale_id": sale_id},
        )

        # Get debt details
        debt = self._debt_repo.get_debt(student_id, sale_id)
        response = debt.to_response()

        # Create transaction for the payment
        try:
            payment_method = PaymentMethod(data.payment_method)
        except ValueError:
            payment_method = PaymentMethod.CASH

        self._transaction_repo.create_transaction(
            TransactionCreate(
                student_id=student_id,
                transaction_type=TransactionType.PRODUCT,
                amount=debt.amount,
                payment_method=payment_method,
                reference_id=sale_id,
                notes=data.notes or f"Cobro deuda: {debt.product_name} x{debt.quantity}",
            )
        )

        # Delete the debt record
        self._debt_repo.delete_debt(student_id, sale_id)

        logger.info(
            "Debt paid and cleared",
            extra={
                "student_id": student_id,
                "sale_id": sale_id,
                "amount": debt.amount,
            },
        )

        return response

    def pay_all_debts(
        self,
        student_id: str,
        data: PayDebtRequest,
    ) -> list[StudentDebtResponse]:
        """Pay all pending debts for a student at once.

        Args:
            student_id: The student's unique identifier.
            data: Payment details (method applies to all).

        Returns:
            List of debts that were paid.
        """
        debts, _ = self._debt_repo.list_for_student(student_id, limit=100)
        paid: list[StudentDebtResponse] = []
        for debt in debts:
            paid.append(
                self.pay_debt(student_id, debt.sale_id, data)
            )
        return paid
