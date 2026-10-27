"""Pydantic v2 models for Student Debt (cargos pendientes de pago / fiado).

Any charge registered in Caja (product, membership, class pack or other) can be
left unpaid ("dejar a deber"). A debt record is created and is cleared when the
student pays it.

DynamoDB key patterns:

StudentDebt:
  PK: STUDENT#{student_id}
  SK: DEBT#{sale_id}
  GSI1PK: PENDING_DEBTS
  GSI1SK: STUDENT#{student_id}#{sale_id}   — list all pending debts

``sale_id`` is the debt identifier. For product sales it is the inventory sale
ID (legacy behaviour); for any other concept it is a freshly generated ID.
``product_id`` / ``product_name`` are kept for every debt (``product_name``
holds the description for non-product concepts) so v2.x code can still read
the records after a rollback.
"""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from src.models.common import TimestampedModel, utc_now
from src.models.transaction import PaymentSplit, TransactionType

# ---------------------------------------------------------------------------
# StudentDebt
# ---------------------------------------------------------------------------

class PayDebtRequest(BaseModel):
    """Request to pay a debt (or all debts) of a student."""

    payment_method: str = Field(
        default="cash", description="cash | card | transfer | mixed"
    )
    payment_splits: list[PaymentSplit] | None = Field(
        default=None,
        description="Breakdown per method — required when payment_method is 'mixed'",
    )
    use_balance: bool = Field(
        default=False,
        description="Cover the debt with the student's balance first (saldo a favor)",
    )
    notes: str | None = Field(default=None, max_length=500)


class StudentDebtResponse(TimestampedModel):
    """Debt record returned in API responses."""

    student_id: str
    sale_id: str
    concept_type: TransactionType = TransactionType.PRODUCT
    description: str
    product_name: str
    amount: float
    quantity: int = 1
    reference_id: str | None = None


class StudentDebtDynamoItem(BaseModel):
    """DynamoDB item for a student debt."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "STUDENT_DEBT"
    student_id: str
    sale_id: str
    product_id: str = ""
    product_name: str
    concept_type: str = TransactionType.PRODUCT.value
    description: str | None = None
    reference_id: str | None = None
    amount: float
    quantity: int = 1
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def _default_description(self) -> "StudentDebtDynamoItem":
        """Legacy product debts have no description — fall back to the product name."""
        if not self.description:
            self.description = self.product_name
        return self

    @classmethod
    def create(
        cls,
        student_id: str,
        sale_id: str,
        amount: float,
        description: str,
        concept_type: TransactionType = TransactionType.PRODUCT,
        product_id: str = "",
        quantity: int = 1,
        reference_id: str | None = None,
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
            product_name=description,
            concept_type=concept_type.value,
            description=description,
            reference_id=reference_id,
            amount=amount,
            quantity=quantity,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> StudentDebtResponse:
        """Convert to API response."""
        concept = (
            TransactionType(self.concept_type)
            if self.concept_type in TransactionType._value2member_map_
            else TransactionType.OTHER
        )
        return StudentDebtResponse(
            student_id=self.student_id,
            sale_id=self.sale_id,
            concept_type=concept,
            description=self.description or self.product_name,
            product_name=self.product_name,
            amount=self.amount,
            quantity=self.quantity,
            reference_id=self.reference_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
