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

from datetime import datetime
from enum import StrEnum

import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from src.models.common import TimestampedModel, new_id, utc_now

# Mexican phone: +52 followed by 10 digits (optional spaces/dashes allowed in input)
_PHONE_RE = re.compile(r"^\+52\d{10}$")


class StudentStatus(StrEnum):
    """Student membership/activity status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    FOUNDER = "founder"
    NEW = "new"


class StudentCreate(BaseModel):
    """Schema for creating a new student."""

    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    email: EmailStr = Field(..., description="Contact email address")
    phone: str | None = Field(
        default=None, max_length=20, description="Phone number with country code"
    )
    status: StudentStatus = Field(default=StudentStatus.NEW, description="Student status")
    notes: str | None = Field(default=None, max_length=1000, description="Internal notes")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Normalize and validate Mexican phone number (+52XXXXXXXXXX)."""
        if v is None or v.strip() == "":
            return None
        # Strip spaces, dashes, parentheses
        cleaned = re.sub(r"[\s\-\(\).]", "", v.strip())
        # Auto-prefix +52 if they only gave 10 digits
        if re.match(r"^\d{10}$", cleaned):
            cleaned = f"+52{cleaned}"
        # Accept 52XXXXXXXXXX without + prefix
        if re.match(r"^52\d{10}$", cleaned):
            cleaned = f"+{cleaned}"
        if not _PHONE_RE.match(cleaned):
            raise ValueError(
                "Teléfono inválido. Formato requerido: +52 seguido de 10 dígitos (ej. +525512345678)"
            )
        return cleaned


class StudentUpdate(BaseModel):
    """Schema for updating an existing student (all fields optional)."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    status: StudentStatus | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Normalize and validate Mexican phone number (+52XXXXXXXXXX)."""
        if v is None or v.strip() == "":
            return None
        cleaned = re.sub(r"[\s\-\(\).]", "", v.strip())
        if re.match(r"^\d{10}$", cleaned):
            cleaned = f"+52{cleaned}"
        if re.match(r"^52\d{10}$", cleaned):
            cleaned = f"+{cleaned}"
        if not _PHONE_RE.match(cleaned):
            raise ValueError(
                "Teléfono inválido. Formato requerido: +52 seguido de 10 dígitos (ej. +525512345678)"
            )
        return cleaned


class StudentResponse(TimestampedModel):
    """Schema returned in API responses."""

    student_id: str = Field(..., description="Unique student identifier")
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    status: StudentStatus
    notes: str | None = None
    full_name: str = Field(default="", description="Computed full name")

    def model_post_init(self, __context: object) -> None:
        """Compute full_name after initialization."""
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}"


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
            status=status,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> StudentResponse:
        """Convert DynamoDB item to API response schema."""
        return StudentResponse(
            student_id=self.student_id,
            first_name=self.first_name,
            last_name=self.last_name,
            email=self.email,
            phone=self.phone,
            status=StudentStatus(self.status),
            notes=self.notes,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
