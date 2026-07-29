"""Balance repository — DynamoDB access patterns for Student Balance."""

from typing import Any

from src.models.balance import (
    BalanceMovementDynamoItem,
    BalanceMovementType,
    StudentBalanceDynamoItem,
)
from src.models.common import utc_now
from src.repositories.dynamo_repository import DynamoRepository


class BalanceRepository(DynamoRepository):
    """Repository for student balance and movement access patterns."""

    # ------------------------------------------------------------------
    # Balance (singleton per student)
    # ------------------------------------------------------------------

    def get_balance(self, student_id: str) -> StudentBalanceDynamoItem:
        """Get the current balance for a student.

        Returns a zero-balance item if none exists yet.

        Access pattern: GET PK=STUDENT#{id}, SK=BALANCE.
        """
        raw = self.get_item(f"STUDENT#{student_id}", "BALANCE")
        if raw is None:
            return StudentBalanceDynamoItem.create(student_id, 0.0)
        return StudentBalanceDynamoItem.model_validate(raw)

    def upsert_balance(
        self, student_id: str, new_balance: float
    ) -> StudentBalanceDynamoItem:
        """Create or update the balance for a student.

        Access pattern: PUT PK=STUDENT#{id}, SK=BALANCE.
        """
        item = StudentBalanceDynamoItem(
            PK=f"STUDENT#{student_id}",
            SK="BALANCE",
            student_id=student_id,
            current_balance=new_balance,
            updated_at=utc_now(),
        )
        self.put_item(item.model_dump(mode="json"))
        return item

    # ------------------------------------------------------------------
    # Balance Movements (ledger)
    # ------------------------------------------------------------------

    def create_movement(
        self,
        student_id: str,
        amount: float,
        movement_type: BalanceMovementType,
        balance_after: float,
        payment_method: str | None = None,
        reference_id: str | None = None,
        notes: str | None = None,
    ) -> BalanceMovementDynamoItem:
        """Record a balance movement.

        Access pattern: PUT PK=STUDENT#{id}, SK=BAL_MOV#{ts}#{id}.
        """
        item = BalanceMovementDynamoItem.create(
            student_id=student_id,
            amount=amount,
            movement_type=movement_type,
            balance_after=balance_after,
            payment_method=payment_method,
            reference_id=reference_id,
            notes=notes,
        )
        self.put_item(item.model_dump(mode="json"))
        return item

    def list_movements_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[BalanceMovementDynamoItem], dict[str, Any] | None]:
        """List balance movements for a student (newest first).

        Access pattern: QUERY PK=STUDENT#{id}, SK begins_with BAL_MOV#.
        """
        items, next_key = self.query_by_pk(
            pk=f"STUDENT#{student_id}",
            sk_begins_with="BAL_MOV#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        items.reverse()  # newest first (SK is timestamp-based)
        return [BalanceMovementDynamoItem.model_validate(i) for i in items], next_key

    def list_movements_by_date(
        self,
        date_str: str,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[BalanceMovementDynamoItem], dict[str, Any] | None]:
        """List all balance movements for a specific date.

        Access pattern: GSI1 PK=BALANCE_MOVEMENTS, SK begins_with DATE#{date}.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="BALANCE_MOVEMENTS",
            sk_name="GSI1SK",
            sk_begins_with=f"DATE#{date_str}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [BalanceMovementDynamoItem.model_validate(i) for i in items], next_key
