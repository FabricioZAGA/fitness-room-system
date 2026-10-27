"""Pydantic v2 models for the student account statement (estado de cuenta).

The statement is a *derived* view: it unifies, per student, everything they
were charged (products, memberships, class packs, other), how each charge was
settled (paid now, paid with balance, still pending) and their balance
deposits. Nothing is stored — it is built from transactions, balance
movements and pending debts.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.transaction import PaymentMethod, PaymentSplit, TransactionType


class AccountEntryKind(StrEnum):
    """What a statement line represents."""

    CHARGE = "charge"      # Something the student bought / was charged
    DEPOSIT = "deposit"    # Money added to the student's balance


class AccountEntryStatus(StrEnum):
    """Settlement status of a charge."""

    PAID = "paid"
    PENDING = "pending"


class AccountEntry(BaseModel):
    """One line of the statement."""

    entry_id: str = Field(..., description="Stable ID (reference, transaction or movement ID)")
    kind: AccountEntryKind
    date: datetime = Field(..., description="When the charge / deposit was registered")
    concept_type: TransactionType | None = Field(
        default=None, description="Charge category (None for deposits)"
    )
    description: str
    amount: float = Field(..., description="Total charged (or deposited)")
    status: AccountEntryStatus = AccountEntryStatus.PAID
    paid_now: float = Field(default=0, description="Portion paid with cash/card/transfer")
    paid_with_balance: float = Field(default=0, description="Portion covered with balance")
    pending_amount: float = Field(default=0, description="Portion still owed")
    payment_method: PaymentMethod | None = None
    payment_splits: list[PaymentSplit] | None = None
    reference_id: str | None = Field(
        default=None, description="membership_id / sale_id / debt id the line belongs to"
    )
    debt_id: str | None = Field(default=None, description="Set while the charge is pending")
    paid_at: datetime | None = Field(default=None, description="When a pending charge was paid")


class StudentAccountResponse(BaseModel):
    """Account statement for a student."""

    student_id: str
    current_balance: float
    total_pending: float
    pending_count: int
    entries: list[AccountEntry] = Field(default_factory=list, description="Newest first")
