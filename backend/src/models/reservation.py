"""Pydantic v2 models for Reservation entity.

DynamoDB key pattern (confirmed reservation):
  PK: CLASS#{class_id}
  SK: RESERVATION#{student_id}

GSI1 (all reservations for a student):
  GSI1PK: STUDENT#{student_id}
  GSI1SK: CLASS#{class_date}#CLASS#{class_id}

GSI2 (list all reservations globally):
  GSI2PK: RESERVATIONS
  GSI2SK: CLASS#{class_id}#STUDENT#{student_id}

Waitlist entry:
  PK: CLASS#{class_id}
  SK: WAITLIST#{position:05d}#{student_id}
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, new_id, utc_now


class ReservationStatus(StrEnum):
    """Reservation lifecycle status."""

    CONFIRMED = "confirmed"
    WAITLISTED = "waitlisted"
    CANCELLED = "cancelled"
    ATTENDED = "attended"
    NO_SHOW = "no_show"


class ReservationCreate(BaseModel):
    """Schema for creating a reservation."""

    student_id: str = Field(..., description="Student ID making the reservation")
    class_id: str = Field(..., description="Class ID to reserve a spot in")


class ReservationUpdate(BaseModel):
    """Schema for updating a reservation status."""

    status: ReservationStatus = Field(..., description="New reservation status")


class ReservationResponse(TimestampedModel):
    """Schema returned in API responses."""

    reservation_id: str
    student_id: str
    class_id: str
    status: ReservationStatus
    waitlist_position: int | None = Field(
        default=None, description="Position in waitlist (null if confirmed)"
    )
    class_date: str | None = Field(default=None, description="Date of the class (ISO format)")


class ReservationDynamoItem(BaseModel):
    """Full DynamoDB item for a confirmed reservation."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    GSI2PK: str
    GSI2SK: str
    EntityType: str = "RESERVATION"
    reservation_id: str
    student_id: str
    class_id: str
    status: str
    class_date: str
    created_at: datetime
    updated_at: datetime
    waitlist_position: int | None = None

    @classmethod
    def from_create(cls, data: ReservationCreate, class_date: str) -> "ReservationDynamoItem":
        """Build a DynamoDB item from a ReservationCreate schema."""
        reservation_id = new_id()
        now = utc_now()
        return cls(
            PK=f"CLASS#{data.class_id}",
            SK=f"RESERVATION#{data.student_id}",
            GSI1PK=f"STUDENT#{data.student_id}",
            GSI1SK=f"CLASS#{class_date}#CLASS#{data.class_id}",
            GSI2PK="RESERVATIONS",
            GSI2SK=f"CLASS#{data.class_id}#STUDENT#{data.student_id}",
            reservation_id=reservation_id,
            student_id=data.student_id,
            class_id=data.class_id,
            status=ReservationStatus.CONFIRMED.value,
            class_date=class_date,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> ReservationResponse:
        """Convert DynamoDB item to API response schema."""
        return ReservationResponse(
            reservation_id=self.reservation_id,
            student_id=self.student_id,
            class_id=self.class_id,
            status=ReservationStatus(self.status),
            class_date=self.class_date,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class WaitlistDynamoItem(BaseModel):
    """Full DynamoDB item for a waitlist entry."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "WAITLIST"
    reservation_id: str
    student_id: str
    class_id: str
    class_date: str
    position: int
    status: str = ReservationStatus.WAITLISTED.value
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(
        cls, data: ReservationCreate, class_date: str, position: int
    ) -> "WaitlistDynamoItem":
        """Build a DynamoDB waitlist item."""
        reservation_id = new_id()
        now = utc_now()
        return cls(
            PK=f"CLASS#{data.class_id}",
            SK=f"WAITLIST#{position:05d}#{data.student_id}",
            GSI1PK=f"STUDENT#{data.student_id}",
            GSI1SK=f"WAITLIST#CLASS#{data.class_id}",
            reservation_id=reservation_id,
            student_id=data.student_id,
            class_id=data.class_id,
            class_date=class_date,
            position=position,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> ReservationResponse:
        """Convert waitlist item to API response schema."""
        return ReservationResponse(
            reservation_id=self.reservation_id,
            student_id=self.student_id,
            class_id=self.class_id,
            status=ReservationStatus.WAITLISTED,
            waitlist_position=self.position,
            class_date=self.class_date,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
