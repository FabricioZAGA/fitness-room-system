"""Instructor model — fitness class instructors and trainers.

Each instructor can teach multiple class types and has their own schedule.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field

from src.models.common import TimestampedModel, new_id, utc_now


class InstructorStatus(StrEnum):
    """Instructor employment status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"


class InstructorCreate(BaseModel):
    """Schema for creating a new instructor."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    specialties: list[str] = Field(
        default_factory=list,
        description="Class types this instructor can teach (e.g., zumba, yoga)",
    )
    bio: str | None = Field(default=None, max_length=1000)
    photo_url: str | None = Field(default=None, max_length=500)
    hourly_rate: float | None = Field(default=None, ge=0)


class InstructorUpdate(BaseModel):
    """Schema for updating an instructor."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    status: InstructorStatus | None = None
    specialties: list[str] | None = None
    bio: str | None = Field(default=None, max_length=1000)
    photo_url: str | None = Field(default=None, max_length=500)
    hourly_rate: float | None = Field(default=None, ge=0)


class InstructorResponse(TimestampedModel):
    """Schema returned in API responses."""

    instructor_id: str
    first_name: str
    last_name: str
    email: str
    phone: str | None
    status: InstructorStatus
    specialties: list[str]
    bio: str | None
    photo_url: str | None
    hourly_rate: float | None
    classes_this_week: int = 0
    total_classes_taught: int = 0

    @property
    def full_name(self) -> str:
        """Return the instructor's full name."""
        return f"{self.first_name} {self.last_name}"


class InstructorDynamoItem(BaseModel):
    """DynamoDB item representation for an instructor.

    Access patterns:
      - Get instructor by ID: PK=INSTRUCTOR#id, SK=INSTRUCTOR#id
      - List all instructors: GSI1PK=INSTRUCTOR, GSI1SK=name
      - List by status: GSI2PK=INSTRUCTOR#status, GSI2SK=name
    """

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    GSI2PK: str
    GSI2SK: str
    instructor_id: str
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    status: InstructorStatus
    specialties: list[str] = Field(default_factory=list)
    bio: str | None = None
    photo_url: str | None = None
    hourly_rate: float | None = None
    classes_this_week: int = 0
    total_classes_taught: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: InstructorCreate) -> "InstructorDynamoItem":
        """Create a new DynamoDB item from creation data."""
        instructor_id = new_id()
        now = utc_now()
        full_name = f"{data.last_name}, {data.first_name}".upper()

        return cls(
            PK=f"INSTRUCTOR#{instructor_id}",
            SK=f"INSTRUCTOR#{instructor_id}",
            GSI1PK="INSTRUCTOR",
            GSI1SK=full_name,
            GSI2PK=f"INSTRUCTOR#{InstructorStatus.ACTIVE}",
            GSI2SK=full_name,
            instructor_id=instructor_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
            status=InstructorStatus.ACTIVE,
            specialties=data.specialties,
            bio=data.bio,
            photo_url=data.photo_url,
            hourly_rate=data.hourly_rate,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> InstructorResponse:
        """Convert to API response schema."""
        return InstructorResponse(
            instructor_id=self.instructor_id,
            first_name=self.first_name,
            last_name=self.last_name,
            email=self.email,
            phone=self.phone,
            status=self.status,
            specialties=self.specialties,
            bio=self.bio,
            photo_url=self.photo_url,
            hourly_rate=self.hourly_rate,
            classes_this_week=self.classes_this_week,
            total_classes_taught=self.total_classes_taught,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
