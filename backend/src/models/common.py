"""Common Pydantic v2 base models and shared schemas."""

from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(tz=UTC)


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
