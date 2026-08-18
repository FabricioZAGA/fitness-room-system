"""Pydantic v2 models for MembershipPlan entity.

Admin-configurable membership plans that define pricing, duration,
session limits, schedule restrictions, and partner requirements.

DynamoDB key pattern:
  PK: MEMBERSHIP_PLANS
  SK: PLAN#{slug}

GSI1 (list all plans sorted by display order):
  GSI1PK: MEMBERSHIP_PLANS
  GSI1SK: ORDER#{sort_order:04d}#{slug}
"""

from datetime import datetime
from re import sub as re_sub

from pydantic import BaseModel, Field, model_validator

from src.models.common import TimestampedModel, utc_now


# ── Helpers ──────────────────────────────────────────────────────────────────


def slugify(text: str) -> str:
    """Convert a label to a URL-safe slug (e.g. 'Room Daily' → 'room_daily')."""
    s = text.strip().lower()
    s = re_sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


# ── Nested schemas ───────────────────────────────────────────────────────────


class BlockedSchedule(BaseModel):
    """A specific time slot blocked for this plan."""

    day: str = Field(..., description="Day of week: mon, tue, wed, thu, fri, sat, sun")
    start: str = Field(..., description="Start time HH:MM (24h)")
    end: str = Field(..., description="End time HH:MM (24h)")


# ── API schemas ──────────────────────────────────────────────────────────────


VALID_DAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
DEFAULT_ALLOWED_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"]


class PlanCreate(BaseModel):
    """Schema for creating a new membership plan."""

    label: str = Field(..., min_length=1, max_length=100, description="Display name")
    description: str = Field(default="", max_length=500, description="Plan description")
    default_price: float = Field(default=0, ge=0, description="Default price in MXN")
    duration_days: int = Field(default=30, ge=1, le=365, description="Duration in days")
    sessions_per_day: int = Field(
        default=1, ge=0, le=10,
        description="Max sessions per day (0 = unlimited)",
    )
    total_sessions: int | None = Field(
        default=None, ge=1,
        description="Total sessions in plan (null = unlimited)",
    )
    allowed_days: list[str] = Field(
        default_factory=lambda: list(DEFAULT_ALLOWED_DAYS),
        description="Days student can reserve",
    )
    blocked_schedules: list[BlockedSchedule] = Field(
        default_factory=list,
        description="Specific time slots blocked for this plan",
    )
    requires_partner: bool = Field(
        default=False,
        description="True for DÚO-type plans requiring a partner",
    )
    sort_order: int = Field(default=0, ge=0, le=9999, description="Display order (lower = first)")

    @model_validator(mode="after")
    def validate_allowed_days(self) -> "PlanCreate":
        """Ensure allowed_days contains only valid day abbreviations."""
        invalid = set(self.allowed_days) - VALID_DAYS
        if invalid:
            raise ValueError(f"Invalid day(s): {invalid}. Must be one of {VALID_DAYS}")
        return self


class PlanUpdate(BaseModel):
    """Schema for updating an existing membership plan."""

    label: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    default_price: float | None = Field(default=None, ge=0)
    duration_days: int | None = Field(default=None, ge=1, le=365)
    sessions_per_day: int | None = Field(default=None, ge=0, le=10)
    total_sessions: int | None = Field(default=None, ge=1)
    clear_total_sessions: bool = Field(
        default=False,
        description="Set total_sessions to null (unlimited)",
    )
    allowed_days: list[str] | None = None
    blocked_schedules: list[BlockedSchedule] | None = None
    requires_partner: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=9999)
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_allowed_days(self) -> "PlanUpdate":
        """Ensure allowed_days contains only valid day abbreviations."""
        if self.allowed_days is not None:
            invalid = set(self.allowed_days) - VALID_DAYS
            if invalid:
                raise ValueError(f"Invalid day(s): {invalid}. Must be one of {VALID_DAYS}")
        return self


class PlanResponse(TimestampedModel):
    """Schema returned in API responses."""

    slug: str
    label: str
    description: str = ""
    default_price: float = 0
    duration_days: int = 30
    sessions_per_day: int = 1
    total_sessions: int | None = None
    allowed_days: list[str] = Field(default_factory=lambda: list(DEFAULT_ALLOWED_DAYS))
    blocked_schedules: list[BlockedSchedule] = Field(default_factory=list)
    requires_partner: bool = False
    is_active: bool = True
    sort_order: int = 0


# ── DynamoDB item ────────────────────────────────────────────────────────────


class PlanDynamoItem(BaseModel):
    """Full DynamoDB item for a membership plan."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "MEMBERSHIP_PLAN"
    slug: str
    label: str
    description: str = ""
    default_price: float = 0
    duration_days: int = 30
    sessions_per_day: int = 1
    total_sessions: int | None = None
    allowed_days: list[str] = Field(default_factory=lambda: list(DEFAULT_ALLOWED_DAYS))
    blocked_schedules: list[dict[str, str]] = Field(default_factory=list)
    requires_partner: bool = False
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: PlanCreate, slug_override: str | None = None) -> "PlanDynamoItem":
        """Build a DynamoDB item from a PlanCreate schema."""
        now = utc_now()
        slug = slug_override or slugify(data.label)
        return cls(
            PK="MEMBERSHIP_PLANS",
            SK=f"PLAN#{slug}",
            GSI1PK="MEMBERSHIP_PLANS",
            GSI1SK=f"ORDER#{data.sort_order:04d}#{slug}",
            slug=slug,
            label=data.label,
            description=data.description,
            default_price=data.default_price,
            duration_days=data.duration_days,
            sessions_per_day=data.sessions_per_day,
            total_sessions=data.total_sessions,
            allowed_days=data.allowed_days,
            blocked_schedules=[bs.model_dump() for bs in data.blocked_schedules],
            requires_partner=data.requires_partner,
            is_active=True,
            sort_order=data.sort_order,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> PlanResponse:
        """Convert DynamoDB item to API response schema."""
        return PlanResponse(
            slug=self.slug,
            label=self.label,
            description=self.description,
            default_price=float(self.default_price),
            duration_days=self.duration_days,
            sessions_per_day=self.sessions_per_day,
            total_sessions=self.total_sessions,
            allowed_days=self.allowed_days,
            blocked_schedules=[BlockedSchedule(**bs) for bs in self.blocked_schedules],
            requires_partner=self.requires_partner,
            is_active=self.is_active,
            sort_order=self.sort_order,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
