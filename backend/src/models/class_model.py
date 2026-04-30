"""Pydantic v2 models for Class entity.

DynamoDB key pattern:
  PK: CLASS#{class_id}
  SK: PROFILE

GSI1 (list classes by date):
  GSI1PK: CLASSES
  GSI1SK: DATE#{date}#CLASS#{class_id}

GSI2 (list by instructor):
  GSI2PK: INSTRUCTOR#{instructor_id}
  GSI2SK: DATE#{date}#CLASS#{class_id}
"""

from datetime import date, datetime, time
from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, new_id, utc_now


class ClassType(StrEnum):
    """Available fitness class types (Fitness Room León catalog)."""

    HYROX = "hyrox"
    STRONG_NATION = "strong_nation"
    ENTRENAMIENTO_FUNCIONAL = "entrenamiento_funcional"
    YOGA = "yoga"
    MAT = "mat"
    ZUMBA = "zumba"
    OTHER = "other"


class ClassMode(StrEnum):
    """Whether a class is in-person or virtual."""

    PRESENCIAL = "presencial"
    VIRTUAL = "virtual"


class DayOfWeek(StrEnum):
    """Days of week for recurring classes."""

    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class ClassCreate(BaseModel):
    """Schema for creating a single class session."""

    class_type: ClassType = Field(..., description="Type of fitness class")
    instructor_name: str = Field(..., min_length=1, max_length=100, description="Instructor name")
    class_date: date = Field(..., description="Date of the class")
    start_time: time = Field(..., description="Class start time (24h format)")
    duration_minutes: int = Field(default=60, ge=15, le=240, description="Duration in minutes")
    capacity: int = Field(default=20, ge=1, le=200, description="Maximum number of students")
    location: str = Field(default="Studio A", max_length=100, description="Class location")
    description: str | None = Field(default=None, max_length=500, description="Class description")
    class_mode: ClassMode = Field(default=ClassMode.PRESENCIAL, description="In-person or virtual")
    class_link: str | None = Field(
        default=None, max_length=500, description="External class link (Zoom/Meet/Zumba)"
    )


class ClassUpdate(BaseModel):
    """Schema for updating an existing class."""

    instructor_name: str | None = Field(default=None, min_length=1, max_length=100)
    class_date: date | None = None
    start_time: time | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=240)
    capacity: int | None = Field(default=None, ge=1, le=200)
    location: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    class_mode: ClassMode | None = None
    class_link: str | None = Field(default=None, max_length=500)
    is_cancelled: bool | None = None


class ClassResponse(TimestampedModel):
    """Schema returned in API responses."""

    class_id: str
    class_type: ClassType
    instructor_name: str
    class_date: date
    start_time: time
    duration_minutes: int
    capacity: int
    reservations_count: int = Field(default=0, description="Current confirmed reservations")
    waitlist_count: int = Field(default=0, description="Students on waitlist")
    available_spots: int = Field(default=0, description="Remaining spots")
    location: str
    description: str | None = None
    class_mode: ClassMode = ClassMode.PRESENCIAL
    class_link: str | None = None
    is_cancelled: bool = False

    def model_post_init(self, __context: object) -> None:
        """Compute available spots after initialization."""
        self.available_spots = max(0, self.capacity - self.reservations_count)


class ClassDynamoItem(BaseModel):
    """Full DynamoDB item representation for a class session."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    GSI2PK: str
    GSI2SK: str
    EntityType: str = "CLASS"
    class_id: str
    class_type: str
    instructor_name: str
    class_date: str
    start_time: str
    duration_minutes: int
    capacity: int
    reservations_count: int = 0
    waitlist_count: int = 0
    location: str
    description: str | None = None
    class_mode: str = "presencial"
    class_link: str | None = None
    is_cancelled: bool = False
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: ClassCreate) -> "ClassDynamoItem":
        """Build a DynamoDB item from a ClassCreate schema."""
        class_id = new_id()
        now = utc_now()
        date_str = data.class_date.isoformat()

        return cls(
            PK=f"CLASS#{class_id}",
            SK="PROFILE",
            GSI1PK="CLASSES",
            GSI1SK=f"DATE#{date_str}#CLASS#{class_id}",
            GSI2PK=f"INSTRUCTOR#{data.instructor_name.lower().replace(' ', '_')}",
            GSI2SK=f"DATE#{date_str}#CLASS#{class_id}",
            class_id=class_id,
            class_type=data.class_type.value,
            instructor_name=data.instructor_name,
            class_date=date_str,
            start_time=data.start_time.isoformat(),
            duration_minutes=data.duration_minutes,
            capacity=data.capacity,
            location=data.location,
            description=data.description,
            class_mode=data.class_mode.value,
            class_link=data.class_link,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> ClassResponse:
        """Convert DynamoDB item to API response schema."""
        return ClassResponse(
            class_id=self.class_id,
            class_type=ClassType(self.class_type),
            instructor_name=self.instructor_name,
            class_date=date.fromisoformat(self.class_date),
            start_time=time.fromisoformat(self.start_time),
            duration_minutes=self.duration_minutes,
            capacity=self.capacity,
            reservations_count=self.reservations_count,
            waitlist_count=self.waitlist_count,
            location=self.location,
            description=self.description,
            class_mode=ClassMode(self.class_mode),
            class_link=self.class_link,
            is_cancelled=self.is_cancelled,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
