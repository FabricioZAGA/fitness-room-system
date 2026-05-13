"""Common Pydantic v2 base models and shared schemas."""

from datetime import UTC, date, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field

MX_TZ = ZoneInfo("America/Mexico_City")


def utc_now() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(tz=UTC)


def mexico_now() -> datetime:
    """Return the current datetime in America/Mexico_City timezone."""
    return datetime.now(tz=MX_TZ)


def mexico_today() -> date:
    """Return today's date in America/Mexico_City timezone.

    Lambda runs in UTC, so ``date.today()`` can be wrong after 6 PM UTC
    (midnight Mexico City) through midnight UTC.
    """
    return mexico_now().date()


def new_id() -> str:
    """Return a new UUID4 string."""
    return str(uuid4())


class TimestampedModel(BaseModel):
    """Base model with audit timestamps."""

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PaginatedResponse[T](BaseModel):
    """Generic paginated API response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool
    last_evaluated_key: str | None = None


class MessageResponse(BaseModel):
    """Simple message response for confirmations."""

    message: str
    success: bool = True
