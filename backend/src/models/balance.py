"""Pydantic v2 models for Student Balance (monedero interno / saldo a favor).

Students can deposit money in advance. When renewing a membership the
balance can be applied to reduce the amount due.

DynamoDB key patterns:

StudentBalance (singleton per student):
  PK: STUDENT#{student_id}
  SK: BALANCE

BalanceMovement (append-only ledger):
  PK: STUDENT#{student_id}
  SK: BAL_MOV#{timestamp}#{movement_id}
  GSI1PK: BALANCE_MOVEMENTS
  GSI1SK: DATE#{date}#{movement_id}   — list all movements by date (for Caja)
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, mexico_today, new_id, utc_now


class BalanceMovementType(StrEnum):
    """Types of balance movements."""

    DEPOSIT = "deposit"                  # Money added by the student
    MEMBERSHIP_APPLY = "membership_apply"  # Balance applied to a membership renewal
    WITHDRAWAL = "withdrawal"            # Manual adjustment / refund


# ---------------------------------------------------------------------------
# StudentBalance (current balance snapshot)
# ---------------------------------------------------------------------------

class StudentBalanceResponse(BaseModel):
    """Current balance for a student."""

    student_id: str
    current_balance: float
    updated_at: datetime


class StudentBalanceDynamoItem(BaseModel):
    """DynamoDB item for the student balance singleton."""

    PK: str
    SK: str = "BALANCE"
    EntityType: str = "STUDENT_BALANCE"
    student_id: str
    current_balance: float = 0.0
    updated_at: datetime

    @classmethod
    def create(cls, student_id: str, initial_balance: float = 0.0) -> "StudentBalanceDynamoItem":
        """Create a new balance record."""
        return cls(
            PK=f"STUDENT#{student_id}",
            SK="BALANCE",
            student_id=student_id,
            current_balance=initial_balance,
            updated_at=utc_now(),
        )

    def to_response(self) -> StudentBalanceResponse:
        """Convert to API response."""
        return StudentBalanceResponse(
            student_id=self.student_id,
            current_balance=self.current_balance,
            updated_at=self.updated_at,
        )


# ---------------------------------------------------------------------------
# BalanceMovement (ledger entry)
# ---------------------------------------------------------------------------

class BalanceDepositRequest(BaseModel):
    """Request to deposit money into a student's balance."""

    amount: float = Field(..., gt=0, description="Amount to deposit in MXN")
    payment_method: str = Field(..., description="cash | card | transfer")
    notes: str | None = Field(default=None, max_length=500)


class BalanceApplyRequest(BaseModel):
    """Request to apply balance toward a membership."""

    amount: float = Field(..., gt=0, description="Amount to apply from balance")
    membership_id: str = Field(..., description="Membership being paid")


class BalanceMovementResponse(TimestampedModel):
    """Balance movement returned in API responses."""

    movement_id: str
    student_id: str
    amount: float
    movement_type: BalanceMovementType
    payment_method: str | None
    reference_id: str | None
    notes: str | None
    balance_after: float


class BalanceMovementDynamoItem(BaseModel):
    """DynamoDB item for a balance movement."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "BALANCE_MOVEMENT"
    movement_id: str
    student_id: str
    amount: float
    movement_type: str
    payment_method: str | None
    reference_id: str | None
    notes: str | None
    balance_after: float
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(
        cls,
        student_id: str,
        amount: float,
        movement_type: BalanceMovementType,
        balance_after: float,
        payment_method: str | None = None,
        reference_id: str | None = None,
        notes: str | None = None,
    ) -> "BalanceMovementDynamoItem":
        """Create a new balance movement record."""
        mov_id = new_id()
        now = utc_now()
        today = mexico_today().isoformat()

        return cls(
            PK=f"STUDENT#{student_id}",
            SK=f"BAL_MOV#{now.isoformat()}#{mov_id}",
            GSI1PK="BALANCE_MOVEMENTS",
            GSI1SK=f"DATE#{today}#{mov_id}",
            movement_id=mov_id,
            student_id=student_id,
            amount=amount,
            movement_type=movement_type.value,
            payment_method=payment_method,
            reference_id=reference_id,
            notes=notes,
            balance_after=balance_after,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> BalanceMovementResponse:
        """Convert to API response."""
        return BalanceMovementResponse(
            movement_id=self.movement_id,
            student_id=self.student_id,
            amount=self.amount,
            movement_type=BalanceMovementType(self.movement_type),
            payment_method=self.payment_method,
            reference_id=self.reference_id,
            notes=self.notes,
            balance_after=self.balance_after,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
