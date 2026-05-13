"""Pydantic v2 models for Transaction and CashCut entities.

Transaction records every payment received (membership, class pack, product sale).
CashCut represents the end-of-day cash register summary.

DynamoDB key patterns:

Transaction:
  PK: TRANSACTION#{tx_id}
  SK: METADATA
  GSI1PK: TRANSACTIONS
  GSI1SK: DATE#{date}#{tx_id}          — list all transactions by date (for cash cut)
  GSI2PK: STUDENT#{student_id}
  GSI2SK: TX#{date}#{tx_id}            — student payment history

CashCut:
  PK: CASHCUT#{cut_id}
  SK: METADATA
  GSI1PK: CASHCUTS
  GSI1SK: DATE#{date}#{cut_id}         — list cuts by date
"""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, mexico_today, new_id, utc_now


class PaymentMethod(StrEnum):
    """Payment methods common in Mexico."""

    CASH = "cash"                   # Efectivo
    CARD = "card"                   # Tarjeta
    TRANSFER = "transfer"           # Transferencia bancaria / OXXO Pay


class TransactionType(StrEnum):
    """What the payment was for."""

    MEMBERSHIP = "membership"       # Monthly, quarterly, etc.
    CLASS_PACK = "class_pack"       # Pack 5/10/20 classes
    PRODUCT = "product"             # Inventory item
    OTHER = "other"                 # Misc charge


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------

class TransactionCreate(BaseModel):
    """Payload to record a new payment."""

    student_id: str | None = Field(
        default=None,
        description="Associated student (None for anonymous product sales)",
    )
    transaction_type: TransactionType = Field(..., description="Category of payment")
    amount: float = Field(..., gt=0, description="Amount received in MXN")
    payment_method: PaymentMethod = Field(..., description="How the student paid")
    reference_id: str | None = Field(
        default=None,
        description="membership_id, inventory_sale_id, etc.",
    )
    notes: str | None = Field(default=None, max_length=500)


class TransactionResponse(TimestampedModel):
    """Schema returned in API responses."""

    transaction_id: str
    student_id: str | None
    transaction_type: TransactionType
    amount: float
    payment_method: PaymentMethod
    reference_id: str | None
    notes: str | None
    transaction_date: str  # ISO date string YYYY-MM-DD


class TransactionDynamoItem(BaseModel):
    """Full DynamoDB item for a transaction."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    GSI2PK: str
    GSI2SK: str
    EntityType: str = "TRANSACTION"
    transaction_id: str
    student_id: str | None
    transaction_type: str
    amount: float
    payment_method: str
    reference_id: str | None
    notes: str | None
    transaction_date: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: TransactionCreate) -> "TransactionDynamoItem":
        tx_id = new_id()
        now = utc_now()
        today = mexico_today().isoformat()
        student_pk = f"STUDENT#{data.student_id}" if data.student_id else "STUDENT#ANONYMOUS"

        return cls(
            PK=f"TRANSACTION#{tx_id}",
            SK="METADATA",
            GSI1PK="TRANSACTIONS",
            GSI1SK=f"DATE#{today}#{tx_id}",
            GSI2PK=student_pk,
            GSI2SK=f"TX#{today}#{tx_id}",
            EntityType="TRANSACTION",
            transaction_id=tx_id,
            student_id=data.student_id,
            transaction_type=data.transaction_type.value,
            amount=data.amount,
            payment_method=data.payment_method.value,
            reference_id=data.reference_id,
            notes=data.notes,
            transaction_date=today,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> TransactionResponse:
        return TransactionResponse(
            transaction_id=self.transaction_id,
            student_id=self.student_id,
            transaction_type=TransactionType(self.transaction_type),
            amount=self.amount,
            payment_method=PaymentMethod(self.payment_method),
            reference_id=self.reference_id,
            notes=self.notes,
            transaction_date=self.transaction_date,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


# ---------------------------------------------------------------------------
# CashCut (Corte de Caja)
# ---------------------------------------------------------------------------

class CashCutCreate(BaseModel):
    """Create an end-of-day cash cut."""

    cut_date: date = Field(..., description="Date of the cash cut (usually today)")
    notes: str | None = Field(default=None, max_length=1000)


class CashCutResponse(TimestampedModel):
    """Cash cut summary returned in API responses."""

    cut_id: str
    cut_date: str
    total_cash: float
    total_card: float
    total_transfer: float
    grand_total: float
    transaction_count: int
    notes: str | None
    transactions: list[TransactionResponse] = Field(default_factory=list)


class CashCutDynamoItem(BaseModel):
    """DynamoDB item for a cash cut record."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "CASHCUT"
    cut_id: str
    cut_date: str
    total_cash: float
    total_card: float
    total_transfer: float
    grand_total: float
    transaction_count: int
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_data(
        cls,
        data: CashCutCreate,
        transactions: list[TransactionDynamoItem],
    ) -> "CashCutDynamoItem":
        cut_id = new_id()
        now = utc_now()
        cut_date_str = data.cut_date.isoformat()

        total_cash = sum(
            t.amount for t in transactions if t.payment_method == PaymentMethod.CASH
        )
        total_card = sum(
            t.amount for t in transactions if t.payment_method == PaymentMethod.CARD
        )
        total_transfer = sum(
            t.amount for t in transactions if t.payment_method == PaymentMethod.TRANSFER
        )

        return cls(
            PK=f"CASHCUT#{cut_id}",
            SK="METADATA",
            GSI1PK="CASHCUTS",
            GSI1SK=f"DATE#{cut_date_str}#{cut_id}",
            cut_id=cut_id,
            cut_date=cut_date_str,
            total_cash=total_cash,
            total_card=total_card,
            total_transfer=total_transfer,
            grand_total=total_cash + total_card + total_transfer,
            transaction_count=len(transactions),
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )

    def to_response(
        self, transactions: list[TransactionResponse] | None = None
    ) -> CashCutResponse:
        return CashCutResponse(
            cut_id=self.cut_id,
            cut_date=self.cut_date,
            total_cash=self.total_cash,
            total_card=self.total_card,
            total_transfer=self.total_transfer,
            grand_total=self.grand_total,
            transaction_count=self.transaction_count,
            notes=self.notes,
            transactions=transactions or [],
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
