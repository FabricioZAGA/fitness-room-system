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

from pydantic import BaseModel, Field, model_validator

from src.models.common import TimestampedModel, mexico_today, new_id, utc_now


class PaymentMethod(StrEnum):
    """Payment methods common in Mexico."""

    CASH = "cash"                   # Efectivo
    CARD = "card"                   # Tarjeta
    TRANSFER = "transfer"           # Transferencia bancaria / OXXO Pay
    MIXED = "mixed"                 # Pago mixto — desglose en payment_splits


BASIC_PAYMENT_METHODS: tuple[str, ...] = (
    PaymentMethod.CASH.value,
    PaymentMethod.CARD.value,
    PaymentMethod.TRANSFER.value,
)

SPLIT_TOLERANCE = 0.01


class PaymentSplit(BaseModel):
    """One portion of a mixed payment (e.g. $300 cash + $500 card)."""

    method: PaymentMethod = Field(..., description="cash | card | transfer")
    amount: float = Field(..., gt=0, description="Portion paid with this method (MXN)")

    @model_validator(mode="after")
    def _no_nested_mixed(self) -> "PaymentSplit":
        """A split cannot itself be 'mixed'."""
        if self.method == PaymentMethod.MIXED:
            raise ValueError("Una parte de un pago mixto no puede ser 'mixed'")
        return self


def validate_payment_splits(
    payment_method: str, amount: float, splits: list[PaymentSplit] | None
) -> list[PaymentSplit] | None:
    """Validate the splits for a payment and return the normalized list.

    - ``mixed`` requires ≥ 2 splits with distinct methods summing to ``amount``.
    - Any other method must not carry splits (they are dropped).

    Raises:
        ValueError: If the breakdown is inconsistent.
    """
    if payment_method != PaymentMethod.MIXED:
        return None
    if not splits or len(splits) < 2:
        raise ValueError("Un pago mixto requiere al menos dos métodos de pago")
    methods = [s.method for s in splits]
    if len(set(methods)) != len(methods):
        raise ValueError("Cada método de pago solo puede aparecer una vez en un pago mixto")
    total = round(sum(s.amount for s in splits), 2)
    if abs(total - round(amount, 2)) > SPLIT_TOLERANCE:
        raise ValueError(
            f"El desglose del pago mixto (${total:,.2f}) no coincide con el total (${amount:,.2f})"
        )
    return splits


def amount_by_method(
    payment_method: str, amount: float, splits: list[dict[str, float | str]] | None
) -> dict[str, float]:
    """Return how much of a payment went to each basic method (cash/card/transfer)."""
    result = dict.fromkeys(BASIC_PAYMENT_METHODS, 0.0)
    if payment_method == PaymentMethod.MIXED and splits:
        for s in splits:
            method = str(s["method"])
            if method in result:
                result[method] += float(s["amount"])
    elif payment_method in result:
        result[payment_method] += amount
    return result


def sum_by_method(
    items: "list[TransactionDynamoItem]",
) -> dict[str, float]:
    """Aggregate cash/card/transfer totals across transactions (mixed-aware)."""
    totals = dict.fromkeys(BASIC_PAYMENT_METHODS, 0.0)
    for t in items:
        for method, value in t.amount_by_method().items():
            totals[method] += value
    return totals


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
    payment_splits: list[PaymentSplit] | None = Field(
        default=None,
        description="Breakdown per method — required when payment_method is 'mixed'",
    )
    reference_id: str | None = Field(
        default=None,
        description="membership_id, inventory_sale_id, etc.",
    )
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _validate_splits(self) -> "TransactionCreate":
        """Ensure mixed payments carry a consistent breakdown."""
        self.payment_splits = validate_payment_splits(
            self.payment_method, self.amount, self.payment_splits
        )
        return self


class TransactionUpdate(BaseModel):
    """Schema for admin-only updates to an existing transaction."""

    amount: float | None = Field(default=None, gt=0, description="Updated amount in MXN")
    payment_method: PaymentMethod | None = Field(
        default=None, description="Updated payment method"
    )
    payment_splits: list[PaymentSplit] | None = Field(
        default=None, description="Updated breakdown (only for mixed payments)"
    )
    transaction_type: TransactionType | None = Field(
        default=None, description="Updated transaction type"
    )
    notes: str | None = Field(default=None, max_length=500)


class TransactionResponse(TimestampedModel):
    """Schema returned in API responses."""

    transaction_id: str
    student_id: str | None
    transaction_type: TransactionType
    amount: float
    payment_method: PaymentMethod
    payment_splits: list[PaymentSplit] | None = None
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
    payment_splits: list[dict[str, float | str]] | None = None
    reference_id: str | None
    notes: str | None
    transaction_date: str
    created_at: datetime
    updated_at: datetime

    def amount_by_method(self) -> dict[str, float]:
        """Portion of this transaction paid with each basic method."""
        return amount_by_method(self.payment_method, self.amount, self.payment_splits)

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
            payment_splits=(
                [s.model_dump(mode="json") for s in data.payment_splits]
                if data.payment_splits
                else None
            ),
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
            payment_splits=(
                [PaymentSplit.model_validate(s) for s in self.payment_splits]
                if self.payment_splits
                else None
            ),
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
    period_start: datetime | None = Field(
        default=None,
        description="Exclusive lower bound: previous cut of the same day (None = start of day)",
    )
    transactions: list[TransactionResponse] = Field(default_factory=list)


class CashCutDynamoItem(BaseModel):
    """DynamoDB item for a cash cut record.

    A cut covers transactions with ``period_start < created_at <= created_at(cut)``
    for ``cut_date``. Multiple cuts per day are allowed; each one starts where the
    previous one ended so the register "resets to zero" right after a cut.
    Legacy cuts (no ``period_start``) cover the whole day.
    """

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
    period_start: datetime | None = None
    is_period_cut: bool = False
    created_at: datetime
    updated_at: datetime

    def covers(self, tx: TransactionDynamoItem) -> bool:
        """Whether a transaction of ``cut_date`` belongs to this cut."""
        if not self.is_period_cut:
            return True
        if self.period_start is not None and tx.created_at <= self.period_start:
            return False
        return tx.created_at <= self.created_at

    @classmethod
    def from_data(
        cls,
        data: CashCutCreate,
        transactions: list[TransactionDynamoItem],
        period_start: datetime | None = None,
        now: datetime | None = None,
    ) -> "CashCutDynamoItem":
        cut_id = new_id()
        now = now or utc_now()
        cut_date_str = data.cut_date.isoformat()

        totals = sum_by_method(transactions)
        total_cash = totals[PaymentMethod.CASH.value]
        total_card = totals[PaymentMethod.CARD.value]
        total_transfer = totals[PaymentMethod.TRANSFER.value]

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
            period_start=period_start,
            is_period_cut=True,
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
            period_start=self.period_start,
            transactions=transactions or [],
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
