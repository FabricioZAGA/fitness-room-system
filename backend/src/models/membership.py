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

GSI3 (find active membership for a student):
  GSI3PK: STUDENT#{student_id}
  GSI3SK: ACTIVE_MEMBERSHIP (only set when status=active)
"""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field, model_validator

from src.models.common import TimestampedModel, new_id, utc_now


class MembershipType(StrEnum):
    """Available membership plan types."""

    FOUNDER_MONTHLY = "founder_monthly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"
    CLASS_PACK_5 = "class_pack_5"
    CLASS_PACK_10 = "class_pack_10"
    CLASS_PACK_20 = "class_pack_20"
    DAY_PASS = "day_pass"


class MembershipStatus(StrEnum):
    """Membership lifecycle status."""

    ACTIVE = "active"
    FROZEN = "frozen"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


class MembershipCreate(BaseModel):
    """Schema for assigning a membership to a student."""

    student_id: str = Field(..., description="Student ID to assign membership to")
    membership_type: MembershipType = Field(..., description="Type of membership plan")
    start_date: date = Field(..., description="Membership start date")
    end_date: date = Field(..., description="Membership expiry date")
    price_paid: float = Field(..., ge=0, description="Amount paid in local currency")
    payment_method: str = Field(
        default="cash",
        description="Payment method used: cash | card | transfer",
    )
    classes_total: int | None = Field(
        default=None,
        ge=1,
        description="Total classes included (for class packs only)",
    )
    notes: str | None = Field(default=None, max_length=500, description="Internal notes")

    @model_validator(mode="after")
    def validate_dates(self) -> "MembershipCreate":
        """Ensure end_date is after start_date."""
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self

    @model_validator(mode="after")
    def validate_class_pack_total(self) -> "MembershipCreate":
        """Require classes_total for class pack memberships."""
        is_class_pack = self.membership_type in (
            MembershipType.CLASS_PACK_5,
            MembershipType.CLASS_PACK_10,
            MembershipType.CLASS_PACK_20,
        )
        if is_class_pack and self.classes_total is None:
            raise ValueError("classes_total is required for class pack memberships")
        return self


class MembershipUpdate(BaseModel):
    """Schema for updating an existing membership."""

    end_date: date | None = None
    status: MembershipStatus | None = None
    price_paid: float | None = Field(default=None, ge=0)
    classes_remaining: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=500)


class FreezeMembershipRequest(BaseModel):
    """Schema for freezing a membership."""

    days: int = Field(..., ge=1, le=180, description="Number of days to freeze (max 180)")


class MembershipResponse(TimestampedModel):
    """Schema returned in API responses."""

    membership_id: str
    student_id: str
    membership_type: MembershipType
    status: MembershipStatus
    start_date: date
    end_date: date
    price_paid: float
    classes_total: int | None = None
    classes_remaining: int | None = None
    notes: str | None = None
    days_until_expiry: int | None = None
    is_frozen: bool = False
    freeze_start_date: date | None = None
    freeze_end_date: date | None = None
    frozen_days_accumulated: int = 0

    def model_post_init(self, __context: object) -> None:
        """Compute days until expiry."""
        today = date.today()
        if self.end_date >= today:
            self.days_until_expiry = (self.end_date - today).days
        else:
            self.days_until_expiry = 0


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
    is_frozen: bool = False
    freeze_start_date: str | None = None
    freeze_end_date: str | None = None
    frozen_days_accumulated: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: MembershipCreate) -> "MembershipDynamoItem":
        """Build a DynamoDB item from a MembershipCreate schema."""
        membership_id = new_id()
        now = utc_now()
        status = MembershipStatus.ACTIVE.value
        membership_type = data.membership_type.value

        is_class_pack = data.membership_type in (
            MembershipType.CLASS_PACK_5,
            MembershipType.CLASS_PACK_10,
            MembershipType.CLASS_PACK_20,
        )
        classes_remaining = data.classes_total if is_class_pack else None

        return cls(
            PK=f"STUDENT#{data.student_id}",
            SK=f"MEMBERSHIP#{membership_id}",
            GSI1PK="MEMBERSHIPS",
            GSI1SK=f"EXPIRY#{data.end_date.isoformat()}#STUDENT#{data.student_id}",
            GSI2PK=f"MEMBERSHIP_TYPE#{membership_type}",
            GSI2SK=f"STUDENT#{data.student_id}",
            GSI3PK=f"STUDENT#{data.student_id}",
            GSI3SK="ACTIVE_MEMBERSHIP",
            membership_id=membership_id,
            student_id=data.student_id,
            membership_type=membership_type,
            status=status,
            start_date=data.start_date.isoformat(),
            end_date=data.end_date.isoformat(),
            price_paid=data.price_paid,
            classes_total=data.classes_total,
            classes_remaining=classes_remaining,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> MembershipResponse:
        """Convert DynamoDB item to API response schema."""
        return MembershipResponse(
            membership_id=self.membership_id,
            student_id=self.student_id,
            membership_type=MembershipType(self.membership_type),
            status=MembershipStatus(self.status),
            start_date=date.fromisoformat(self.start_date),
            end_date=date.fromisoformat(self.end_date),
            price_paid=self.price_paid,
            classes_total=self.classes_total,
            classes_remaining=self.classes_remaining,
            notes=self.notes,
            is_frozen=self.is_frozen,
            freeze_start_date=date.fromisoformat(self.freeze_start_date) if self.freeze_start_date else None,
            freeze_end_date=date.fromisoformat(self.freeze_end_date) if self.freeze_end_date else None,
            frozen_days_accumulated=self.frozen_days_accumulated,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
