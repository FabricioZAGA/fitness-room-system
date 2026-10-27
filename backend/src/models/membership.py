"""Pydantic v2 models for Membership entity.

DynamoDB key pattern:
  PK: STUDENT#{student_id}
  SK: MEMBERSHIP#{membership_id}

GSI1 (list all memberships by expiry — for renewal alerts):
  GSI1PK: MEMBERSHIPS
  GSI1SK: EXPIRY#{expiry_date}#STUDENT#{student_id}

GSI2 (filter by membership type):
  GSI2PK: MEMBERSHIP_TYPE#{membership_type}
  GSI2SK: STUDENT#{student_id}

GSI3 (find active / queued memberships for a student):
  GSI3PK: STUDENT#{student_id}
  GSI3SK: ACTIVE_MEMBERSHIP                                (status=active)
          PENDING_MEMBERSHIP#{start_date}#{membership_id}  (status=pending, queued renewal)
          INACTIVE_MEMBERSHIP#{membership_id}              (any other status)
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from src.models.common import TimestampedModel, mexico_today, new_id, utc_now
from src.models.transaction import PaymentSplit, validate_payment_splits

GSI3_ACTIVE = "ACTIVE_MEMBERSHIP"
GSI3_PENDING_PREFIX = "PENDING_MEMBERSHIP#"
GSI3_INACTIVE_PREFIX = "INACTIVE_MEMBERSHIP#"


class MembershipType:
    """Well-known membership plan slugs (reference constants).

    New plans created via the admin UI are stored in DynamoDB and do NOT
    need to be listed here.  These constants exist only so backend code
    can reference legacy plan slugs without magic strings.
    """

    FOUNDER = "founder"
    ROOM_DAILY = "room_daily"
    ROOM_ELITE = "room_elite"
    ROOM_FLEX = "room_flex"
    ROOM_PASS = "room_pass"
    ROOM_DUO = "room_duo"
    KILO_A_KILO = "kilo_a_kilo"
    COURTESY = "courtesy"


class MembershipStatus(StrEnum):
    """Membership lifecycle status.

    - pending: queued renewal; becomes active when the previous one ends
    - active: current membership granting access
    - frozen: paused (freeze request, suspension or deactivation)
    - expired: past its end date
    - cancelled: LEGACY (read-only). Never written since v3.0.0 — memberships
      are not refunded, so they are frozen or left to expire instead.
    """

    ACTIVE = "active"
    FROZEN = "frozen"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


def gsi3_sk_for(status: str, membership_id: str, start_date: str) -> str:
    """Return the GSI3 sort key matching a membership status."""
    if status == MembershipStatus.ACTIVE.value:
        return GSI3_ACTIVE
    if status == MembershipStatus.PENDING.value:
        return f"{GSI3_PENDING_PREFIX}{start_date}#{membership_id}"
    return f"{GSI3_INACTIVE_PREFIX}{membership_id}"


class MembershipCreate(BaseModel):
    """Schema for assigning a membership to a student."""

    student_id: str = Field(..., description="Student ID to assign membership to")
    membership_type: str = Field(..., min_length=1, description="Plan slug (e.g. 'room_daily')")
    start_date: date = Field(..., description="Membership start date")
    end_date: date = Field(..., description="Membership expiry date")
    price_paid: float = Field(..., ge=0, description="Amount paid in local currency")
    payment_method: str = Field(
        default="cash",
        description="Payment method used: cash | card | transfer | mixed",
    )
    payment_splits: list[PaymentSplit] | None = Field(
        default=None,
        description="Breakdown per method — required when payment_method is 'mixed'",
    )
    classes_total: int | None = Field(
        default=None,
        ge=1,
        description="Total classes included (for class packs only)",
    )
    notes: str | None = Field(default=None, max_length=500, description="Internal notes")
    duo_partner_id: str | None = Field(
        default=None,
        description="Student ID of the duo partner (required for room_duo)",
    )
    duo_partner_name: str | None = Field(
        default=None,
        max_length=200,
        description="Display name of the duo partner (auto-filled)",
    )
    payment_status: Literal["paid", "pending"] = Field(
        default="paid",
        description="'pending' records the full price as a student debt (fiado)",
    )
    balance_amount: float = Field(
        default=0,
        ge=0,
        description="Portion of price_paid covered with the student's balance (saldo a favor)",
    )

    @model_validator(mode="after")
    def validate_dates(self) -> "MembershipCreate":
        """Ensure end_date is after start_date."""
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self

    @model_validator(mode="after")
    def validate_splits(self) -> "MembershipCreate":
        """Ensure a mixed payment's breakdown adds up to the amount paid now.

        The amount paid now is ``price_paid`` minus the balance applied. Pending
        (fiado) memberships carry no payment breakdown.
        """
        if self.balance_amount > self.price_paid:
            raise ValueError("balance_amount cannot exceed price_paid")
        if self.payment_status == "pending":
            self.balance_amount = 0
            self.payment_splits = None
            return self
        due_now = round(self.price_paid - self.balance_amount, 2)
        if due_now > 0:
            self.payment_splits = validate_payment_splits(
                self.payment_method, due_now, self.payment_splits
            )
        else:
            self.payment_splits = None
        return self


class MembershipUpdate(BaseModel):
    """Schema for updating an existing membership."""

    start_date: date | None = None
    end_date: date | None = None
    membership_type: str | None = None
    status: MembershipStatus | None = None
    price_paid: float | None = Field(default=None, ge=0)
    payment_method: str | None = Field(
        default=None,
        description="Payment method: cash | card | transfer | mixed",
    )
    payment_splits: list[PaymentSplit] | None = Field(
        default=None,
        description="Updated breakdown for mixed payments (synced to the transaction)",
    )
    classes_total: int | None = Field(default=None, ge=1)
    classes_remaining: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=500)
    duo_partner_id: str | None = None
    duo_partner_name: str | None = Field(default=None, max_length=200)


class FreezeMembershipRequest(BaseModel):
    """Schema for freezing a membership."""

    days: int = Field(..., ge=1, le=180, description="Number of days to freeze (max 180)")


class MembershipResponse(TimestampedModel):
    """Schema returned in API responses."""

    membership_id: str
    student_id: str
    membership_type: str
    status: MembershipStatus
    start_date: date
    end_date: date
    price_paid: float
    classes_total: int | None = None
    classes_remaining: int | None = None
    notes: str | None = None
    duo_partner_id: str | None = None
    duo_partner_name: str | None = None
    days_until_expiry: int | None = None
    days_until_start: int | None = None
    is_frozen: bool = False
    freeze_start_date: date | None = None
    freeze_end_date: date | None = None
    frozen_days_accumulated: int = 0

    def model_post_init(self, __context: object) -> None:
        """Compute days until expiry (and until start, for queued memberships)."""
        today = mexico_today()
        if self.end_date >= today:
            self.days_until_expiry = (self.end_date - today).days
        else:
            self.days_until_expiry = 0
        if self.status == MembershipStatus.PENDING:
            self.days_until_start = max((self.start_date - today).days, 0)


class LapsedStudentResponse(BaseModel):
    """A non-inactive student without an active, frozen or queued membership."""

    student_id: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    photo_url: str | None = None
    student_status: str
    last_membership_id: str | None = None
    last_membership_type: str | None = None
    last_end_date: date | None = None
    days_since_expiry: int | None = None


class MembershipDynamoItem(BaseModel):
    """Full DynamoDB item representation for a membership."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    GSI2PK: str
    GSI2SK: str
    GSI3PK: str
    GSI3SK: str
    EntityType: str = "MEMBERSHIP"
    membership_id: str
    student_id: str
    membership_type: str
    status: str
    start_date: str
    end_date: str
    price_paid: float
    classes_total: int | None = None
    classes_remaining: int | None = None
    notes: str | None = None
    duo_partner_id: str | None = None
    duo_partner_name: str | None = None
    is_frozen: bool = False
    freeze_start_date: str | None = None
    freeze_end_date: str | None = None
    frozen_days_accumulated: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(
        cls,
        data: MembershipCreate,
        status: MembershipStatus = MembershipStatus.ACTIVE,
    ) -> "MembershipDynamoItem":
        """Build a DynamoDB item from a MembershipCreate schema.

        Args:
            data: Validated creation payload (dates already resolved).
            status: ``active`` or ``pending`` (queued renewal).
        """
        membership_id = new_id()
        now = utc_now()
        membership_type = data.membership_type
        start_date = data.start_date.isoformat()

        # Any plan with classes_total is a session pack → track remaining
        classes_remaining = data.classes_total if data.classes_total is not None else None

        return cls(
            PK=f"STUDENT#{data.student_id}",
            SK=f"MEMBERSHIP#{membership_id}",
            GSI1PK="MEMBERSHIPS",
            GSI1SK=f"EXPIRY#{data.end_date.isoformat()}#STUDENT#{data.student_id}",
            GSI2PK=f"MEMBERSHIP_TYPE#{membership_type}",
            GSI2SK=f"STUDENT#{data.student_id}",
            GSI3PK=f"STUDENT#{data.student_id}",
            GSI3SK=gsi3_sk_for(status.value, membership_id, start_date),
            membership_id=membership_id,
            student_id=data.student_id,
            membership_type=membership_type,
            status=status.value,
            start_date=start_date,
            end_date=data.end_date.isoformat(),
            price_paid=data.price_paid,
            classes_total=data.classes_total,
            classes_remaining=classes_remaining,
            notes=data.notes,
            duo_partner_id=data.duo_partner_id,
            duo_partner_name=data.duo_partner_name,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> MembershipResponse:
        """Convert DynamoDB item to API response schema."""
        return MembershipResponse(
            membership_id=self.membership_id,
            student_id=self.student_id,
            membership_type=self.membership_type,
            status=MembershipStatus(self.status),
            start_date=date.fromisoformat(self.start_date),
            end_date=date.fromisoformat(self.end_date),
            price_paid=self.price_paid,
            classes_total=self.classes_total,
            classes_remaining=self.classes_remaining,
            notes=self.notes,
            duo_partner_id=self.duo_partner_id,
            duo_partner_name=self.duo_partner_name,
            is_frozen=self.is_frozen,
            freeze_start_date=date.fromisoformat(self.freeze_start_date) if self.freeze_start_date else None,
            freeze_end_date=date.fromisoformat(self.freeze_end_date) if self.freeze_end_date else None,
            frozen_days_accumulated=self.frozen_days_accumulated,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
