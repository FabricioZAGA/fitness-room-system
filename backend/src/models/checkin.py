"""Pydantic v2 models for Check-in entity.

DynamoDB key pattern:
  PK: STUDENT#{student_id}
  SK: CHECKIN#{datetime_iso}

No GSIs in Phase 1 — checkins are write-heavy, read rarely.
"""

from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.common import new_id, utc_now


class CheckinReason(StrEnum):
    """Reason for check-in outcome."""

    ALL_GOOD = "all_good"
    EXPIRING_SOON = "expiring_soon"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    NO_MEMBERSHIP = "no_membership"
    EXPIRED = "expired"


class CheckinResponse(BaseModel):
    """Response returned after a check-in attempt."""

    checkin_id: str = Field(..., description="Unique check-in record ID")
    student_id: str
    checked_in_at: str = Field(..., description="ISO 8601 UTC timestamp")
    can_enter: bool = Field(..., description="Whether the student is allowed entry")
    reason: CheckinReason
    days_until_expiry: int | None = None
    membership_type: str | None = None


class CheckinDynamoItem(BaseModel):
    """DynamoDB item for a check-in event."""

    PK: str
    SK: str
    EntityType: str = "CHECKIN"
    checkin_id: str
    student_id: str
    checked_in_at: str
    can_enter: bool
    reason: str

    @classmethod
    def create(
        cls,
        student_id: str,
        can_enter: bool,
        reason: CheckinReason,
    ) -> "CheckinDynamoItem":
        """Build a new check-in item."""
        now = utc_now()
        return cls(
            PK=f"STUDENT#{student_id}",
            SK=f"CHECKIN#{now.isoformat()}",
            checkin_id=new_id(),
            student_id=student_id,
            checked_in_at=now.isoformat(),
            can_enter=can_enter,
            reason=reason.value,
        )
