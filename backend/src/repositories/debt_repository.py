"""Debt repository — DynamoDB access patterns for Student Debts (fiado)."""

from typing import Any

from src.models.debt import StudentDebtDynamoItem
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class DebtRepository(DynamoRepository):
    """Repository for student debt access patterns."""

    def create_debt(
        self,
        student_id: str,
        sale_id: str,
        product_id: str,
        product_name: str,
        amount: float,
        quantity: int = 1,
    ) -> StudentDebtDynamoItem:
        """Create a new debt record for an unpaid product sale.

        Access pattern: PUT PK=STUDENT#{id}, SK=DEBT#{sale_id}.
        """
        item = StudentDebtDynamoItem.create(
            student_id=student_id,
            sale_id=sale_id,
            product_id=product_id,
            product_name=product_name,
            amount=amount,
            quantity=quantity,
        )
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_debt(self, student_id: str, sale_id: str) -> StudentDebtDynamoItem:
        """Get a specific debt by student and sale ID.

        Access pattern: GET PK=STUDENT#{id}, SK=DEBT#{sale_id}.
        """
        raw = self.get_item(f"STUDENT#{student_id}", f"DEBT#{sale_id}")
        if raw is None:
            raise ResourceNotFoundException(
                f"Debt for sale '{sale_id}' of student '{student_id}' not found"
            )
        return StudentDebtDynamoItem.model_validate(raw)

    def list_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[StudentDebtDynamoItem], dict[str, Any] | None]:
        """List all pending debts for a student.

        Access pattern: QUERY PK=STUDENT#{id}, SK begins_with DEBT#.
        """
        items, next_key = self.query_by_pk(
            pk=f"STUDENT#{student_id}",
            sk_begins_with="DEBT#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [StudentDebtDynamoItem.model_validate(i) for i in items], next_key

    def list_all_pending(
        self,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[StudentDebtDynamoItem], dict[str, Any] | None]:
        """List all pending debts across all students.

        Access pattern: GSI1 PK=PENDING_DEBTS, SK begins_with STUDENT#.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="PENDING_DEBTS",
            sk_name="GSI1SK",
            sk_begins_with="STUDENT#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [StudentDebtDynamoItem.model_validate(i) for i in items], next_key

    def delete_debt(self, student_id: str, sale_id: str) -> None:
        """Delete a debt record after payment.

        Access pattern: DELETE PK=STUDENT#{id}, SK=DEBT#{sale_id}.
        """
        self.delete_item(f"STUDENT#{student_id}", f"DEBT#{sale_id}")
