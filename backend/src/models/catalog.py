"""Pydantic v2 models for Catalog entity.

Provides dynamic, admin-configurable catalogs for class types, instructor
specialties, and any other list the gym needs.

DynamoDB key pattern:
  PK: CATALOG#{catalog_name}
  SK: ITEM#{slug}

GSI1 (list all items in a catalog, sorted by sort_order):
  GSI1PK: CATALOG#{catalog_name}
  GSI1SK: ORDER#{sort_order:04d}#{slug}
"""

from datetime import datetime
from re import sub as re_sub

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, utc_now


# ── Helpers ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Convert a label to a URL-safe slug (e.g. 'Strong Nation' → 'strong_nation')."""
    s = text.strip().lower()
    s = re_sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


# ── Catalog names (constants, not an enum — extensible) ─────────────────────

CATALOG_CLASS_TYPES = "class_types"
CATALOG_SPECIALTIES = "specialties"
VALID_CATALOG_NAMES = {CATALOG_CLASS_TYPES, CATALOG_SPECIALTIES}


# ── API schemas ──────────────────────────────────────────────────────────────

class CatalogItemCreate(BaseModel):
    """Schema for creating a new catalog item."""

    label: str = Field(..., min_length=1, max_length=100, description="Display name")
    color: str = Field(
        default="",
        max_length=200,
        description="CSS class(es) for styling (e.g. Tailwind utilities)",
    )
    sort_order: int = Field(default=0, ge=0, le=9999, description="Sort priority (lower = first)")


class CatalogItemUpdate(BaseModel):
    """Schema for updating an existing catalog item."""

    label: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=200)
    sort_order: int | None = Field(default=None, ge=0, le=9999)
    is_active: bool | None = None


class CatalogItemResponse(TimestampedModel):
    """Schema returned in API responses."""

    catalog_name: str
    slug: str
    label: str
    color: str
    sort_order: int
    is_active: bool


# ── DynamoDB item ────────────────────────────────────────────────────────────

class CatalogItemDynamo(BaseModel):
    """Full DynamoDB item for a catalog entry."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "CATALOG_ITEM"
    catalog_name: str
    slug: str
    label: str
    color: str = ""
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(
        cls,
        catalog_name: str,
        data: CatalogItemCreate,
        slug_override: str | None = None,
    ) -> "CatalogItemDynamo":
        """Create a new DynamoDB item from creation data."""
        now = utc_now()
        slug = slug_override or slugify(data.label)
        return cls(
            PK=f"CATALOG#{catalog_name}",
            SK=f"ITEM#{slug}",
            GSI1PK=f"CATALOG#{catalog_name}",
            GSI1SK=f"ORDER#{data.sort_order:04d}#{slug}",
            catalog_name=catalog_name,
            slug=slug,
            label=data.label,
            color=data.color,
            sort_order=data.sort_order,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> CatalogItemResponse:
        """Convert to API response schema."""
        return CatalogItemResponse(
            catalog_name=self.catalog_name,
            slug=self.slug,
            label=self.label,
            color=self.color,
            sort_order=self.sort_order,
            is_active=self.is_active,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
