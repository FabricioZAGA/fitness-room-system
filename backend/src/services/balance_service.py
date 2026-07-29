"""Balance service — business logic for student balance (monedero interno)."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.balance import (
    BalanceApplyRequest,
    BalanceDepositRequest,
    BalanceMovementResponse,
    BalanceMovementType,
    StudentBalanceResponse,
)
from src.models.transaction import PaymentMethod, TransactionCreate, TransactionType
from src.repositories.balance_repository import BalanceRepository
from src.repositories.student_repository import StudentRepository
from src.repositories.transaction_repository import TransactionRepository
from src.utils.exceptions import InvalidOperationException

logger = Logger()


class BalanceService:
    """Service for student balance operations."""

    def __init__(
        self,
        balance_repo: BalanceRepository | None = None,
        student_repo: StudentRepository | None = None,
        transaction_repo: TransactionRepository | None = None,
    ) -> None:
        self._balance_repo = balance_repo or BalanceRepository()
        self._student_repo = student_repo or StudentRepository()
        self._transaction_repo = transaction_repo or TransactionRepository()

    def get_balance(self, student_id: str) -> StudentBalanceResponse:
        """Get the current balance for a student.

        Args:
            student_id: The student's unique identifier.

        Returns:
            Current balance response (returns 0 if no balance exists).
        """
        item = self._balance_repo.get_balance(student_id)
        return item.to_response()

    def deposit(
        self, student_id: str, data: BalanceDepositRequest
    ) -> BalanceMovementResponse:
        """Deposit money into a student's balance.

        Steps:
        1. Verify student exists.
        2. Get current balance.
        3. Add deposit amount.
        4. Update balance.
        5. Record movement.
        6. Create matching Transaction.

        Args:
            student_id: The student's unique identifier.
            data: Deposit request with amount and payment method.

        Returns:
            The recorded balance movement.
        """
        logger.info(
            "Processing balance deposit",
            extra={"student_id": student_id, "amount": data.amount},
        )

        # Verify student exists
        self._student_repo.get_by_id(student_id)

        # Get current balance and compute new one
        current = self._balance_repo.get_balance(student_id)
        new_balance = current.current_balance + data.amount

        # Update balance
        self._balance_repo.upsert_balance(student_id, new_balance)

        # Record movement
        movement = self._balance_repo.create_movement(
            student_id=student_id,
            amount=data.amount,
            movement_type=BalanceMovementType.DEPOSIT,
            balance_after=new_balance,
            payment_method=data.payment_method,
            notes=data.notes,
        )

        # Create matching transaction for income tracking
        try:
            payment_method = PaymentMethod(data.payment_method)
        except ValueError:
            payment_method = PaymentMethod.CASH

        self._transaction_repo.create_transaction(
            TransactionCreate(
                student_id=student_id,
                transaction_type=TransactionType.OTHER,
                amount=data.amount,
                payment_method=payment_method,
                reference_id=movement.movement_id,
                notes=f"Abono a cuenta: {data.notes or 'Saldo a favor'}",
            )
        )

        logger.info(
            "Balance deposit recorded",
            extra={
                "student_id": student_id,
                "deposited": data.amount,
                "new_balance": new_balance,
            },
        )

        return movement.to_response()

    def apply_to_membership(
        self, student_id: str, data: BalanceApplyRequest
    ) -> BalanceMovementResponse:
        """Apply balance toward a membership payment.

        Steps:
        1. Verify student exists.
        2. Get current balance.
        3. Validate sufficient balance.
        4. Subtract amount.
        5. Update balance.
        6. Record movement.

        Args:
            student_id: The student's unique identifier.
            data: Apply request with amount and membership_id.

        Returns:
            The recorded balance movement.

        Raises:
            InvalidOperationException: If insufficient balance.
        """
        logger.info(
            "Applying balance to membership",
            extra={
                "student_id": student_id,
                "amount": data.amount,
                "membership_id": data.membership_id,
            },
        )

        # Verify student exists
        self._student_repo.get_by_id(student_id)

        # Get current balance
        current = self._balance_repo.get_balance(student_id)
        if current.current_balance < data.amount:
            raise InvalidOperationException(
                f"Saldo insuficiente: tiene ${current.current_balance:.2f}, "
                f"se requieren ${data.amount:.2f}"
            )

        new_balance = current.current_balance - data.amount

        # Update balance
        self._balance_repo.upsert_balance(student_id, new_balance)

        # Record movement
        movement = self._balance_repo.create_movement(
            student_id=student_id,
            amount=-data.amount,
            movement_type=BalanceMovementType.MEMBERSHIP_APPLY,
            balance_after=new_balance,
            reference_id=data.membership_id,
            notes=f"Aplicado a membresía {data.membership_id}",
        )

        logger.info(
            "Balance applied to membership",
            extra={
                "student_id": student_id,
                "applied": data.amount,
                "new_balance": new_balance,
            },
        )

        return movement.to_response()

    def list_movements(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[BalanceMovementResponse], dict[str, Any] | None]:
        """List balance movements for a student.

        Args:
            student_id: The student's unique identifier.
            limit: Maximum number of results.
            last_evaluated_key: Pagination token.

        Returns:
            Tuple of (movement list, next page token).
        """
        items, next_key = self._balance_repo.list_movements_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key
