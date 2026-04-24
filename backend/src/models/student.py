"""Pydantic v2 models for Student entity.

DynamoDB key pattern:
  PK: STUDENT#{student_id}
  SK: PROFILE

GSI1 (list all students by status):
  GSI1PK: STUDENTS
  GSI1SK: STATUS#{status}#STUDENT#{student_id}

GSI2 (filter by status):
  GSI2PK: STATUS#{status}
  GSI2SK: STUDENT#{student_id}
"""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field, field_validator

from src.models.common import TimestampedModel, new_id, utc_now
from src.utils.phone import validate_phone_optional, validate_phone_required


class StudentStatus(StrEnum):
    """Student lifecycle status.

    - active: can check-in and use the gym
    - inactive: deactivated (voluntary or involuntary), membership cancelled
    - suspended: temporarily blocked (conduct, debt), membership frozen
    """

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class EmergencyContact(BaseModel):
    """Nested schema for emergency contact information."""

    name: str = Field(..., min_length=1, max_length=100, description="Contact full name")
    relationship: str = Field(
        ..., min_length=1, max_length=50,
        description="Relationship (e.g. madre, padre, hermano)",
    )
    phone: str = Field(..., max_length=20, description="Contact phone number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Normalize and validate phone number in E.164 format."""
        return validate_phone_required(v)


class StudentCreate(BaseModel):
    """Schema for creating a new student."""

    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    email: EmailStr = Field(..., description="Contact email address")
    phone: str | None = Field(
        default=None, max_length=20, description="Phone number with country code"
    )
    birth_date: date | None = Field(default=None, description="Date of birth (YYYY-MM-DD)")
    address: str | None = Field(default=None, max_length=300, description="Street address")
    city: str | None = Field(default=None, max_length=100, description="City")
    emergency_contact: EmergencyContact | None = Field(
        default=None, description="Emergency contact information"
    )
    photo_url: str | None = Field(default=None, max_length=500, description="Profile photo S3 URL")
    status: StudentStatus = Field(default=StudentStatus.ACTIVE, description="Student status")
    notes: str | None = Field(default=None, max_length=1000, description="Internal notes")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Normalize and validate phone number in E.164 format."""
        return validate_phone_optional(v)


class StudentUpdate(BaseModel):
    """Schema for updating an existing student (all fields optional)."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    birth_date: date | None = None
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=100)
    emergency_contact: EmergencyContact | None = None
    photo_url: str | None = Field(default=None, max_length=500)
    status: StudentStatus | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Normalize and validate phone number in E.164 format."""
        return validate_phone_optional(v)


class StudentResponse(TimestampedModel):
    """Schema returned in API responses."""

    student_id: str = Field(..., description="Unique student identifier")
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    birth_date: date | None = None
    age: int | None = None
    address: str | None = None
    city: str | None = None
    emergency_contact: EmergencyContact | None = None
    photo_url: str | None = None
    status: StudentStatus
    notes: str | None = None
    full_name: str = Field(default="", description="Computed full name")

    def model_post_init(self, __context: object) -> None:
        """Compute full_name and age after initialization."""
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}"
        if self.birth_date:
            today = date.today()
            self.age = (
                today.year - self.birth_date.year
                - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
            )


class StudentDynamoItem(BaseModel):
    """Full DynamoDB item representation for a student."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    GSI2PK: str
    GSI2SK: str
    EntityType: str = "STUDENT"
    student_id: str
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    birth_date: str | None = None
    address: str | None = None
    city: str | None = None
    emergency_contact: dict[str, str] | None = None
    photo_url: str | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: StudentCreate) -> "StudentDynamoItem":
        """Build a DynamoDB item from a StudentCreate schema."""
        student_id = new_id()
        now = utc_now()
        status = data.status.value
        return cls(
            PK=f"STUDENT#{student_id}",
            SK="PROFILE",
            GSI1PK="STUDENTS",
            GSI1SK=f"STATUS#{status}#STUDENT#{student_id}",
            GSI2PK=f"STATUS#{status}",
            GSI2SK=f"STUDENT#{student_id}",
            student_id=student_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
            birth_date=data.birth_date.isoformat() if data.birth_date else None,
            address=data.address,
            city=data.city,
            emergency_contact=(
                data.emergency_contact.model_dump()
                if data.emergency_contact
                else None
            ),
            photo_url=data.photo_url,
            status=status,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> StudentResponse:
        """Convert DynamoDB item to API response schema."""
        ec = EmergencyContact(**self.emergency_contact) if self.emergency_contact else None
        return StudentResponse(
            student_id=self.student_id,
            first_name=self.first_name,
            last_name=self.last_name,
            email=self.email,
            phone=self.phone,
            birth_date=date.fromisoformat(self.birth_date) if self.birth_date else None,
            address=self.address,
            city=self.city,
            emergency_contact=ec,
            photo_url=self.photo_url,
            status=StudentStatus(self.status) if self.status in StudentStatus._value2member_map_ else StudentStatus.ACTIVE,
            notes=self.notes,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
