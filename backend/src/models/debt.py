"""Pydantic v2 models for Student Debt (ventas pendientes de pago / fiado).

When a product is sold without immediate payment, a debt record is created.
The debt is cleared when the student pays.

DynamoDB key patterns:

StudentDebt:
  PK: STUDENT#{student_id}
  SK: DEBT#{sale_id}
  GSI1PK: PENDING_DEBTS
  GSI1SK: STUDENT#{student_id}#{sale_id}   — list all pending debts
"""

from datetime import datetime

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, utc_now


# ---------------------------------------------------------------------------
# StudentDebt
# ---------------------------------------------------------------------------

class PayDebtRequest(BaseModel):
    """Request to mark a debt as paid."""

    payment_method: str = Field(..., description="cash | card | transfer")
    notes: str | None = Field(default=None, max_length=500)


class StudentDebtResponse(TimestampedModel):
    """Debt record returned in API responses."""

    student_id: str
    sale_id: str
    product_name: str
    amount: float
    quantity: int = 1


class StudentDebtDynamoItem(BaseModel):
    """DynamoDB item for a student debt."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "STUDENT_DEBT"
    student_id: str
    sale_id: str
    product_id: str
    product_name: str
    amount: float
    quantity: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(
        cls,
        student_id: str,
        sale_id: str,
        product_id: str,
        product_name: str,
        amount: float,
        quantity: int = 1,
    ) -> "StudentDebtDynamoItem":
        """Create a new debt record."""
        now = utc_now()
        return cls(
            PK=f"STUDENT#{student_id}",
            SK=f"DEBT#{sale_id}",
            GSI1PK="PENDING_DEBTS",
            GSI1SK=f"STUDENT#{student_id}#{sale_id}",
            student_id=student_id,
            sale_id=sale_id,
            product_id=product_id,
            product_name=product_name,
            amount=amount,
            quantity=quantity,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> StudentDebtResponse:
        """Convert to API response."""
        return StudentDebtResponse(
            student_id=self.student_id,
            sale_id=self.sale_id,
            product_name=self.product_name,
            amount=self.amount,
            quantity=self.quantity,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
