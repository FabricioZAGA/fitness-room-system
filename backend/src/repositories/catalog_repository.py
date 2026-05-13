"""Catalog repository — DynamoDB access patterns for configurable catalogs."""

from typing import Any

from src.models.catalog import (
    CatalogItemCreate,
    CatalogItemDynamo,
    CatalogItemUpdate,
)
from src.models.common import utc_now
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class CatalogRepository(DynamoRepository):
    """Data access layer for catalog items (class types, specialties, etc.)."""

    def create(self, catalog_name: str, data: CatalogItemCreate, slug_override: str | None = None) -> CatalogItemDynamo:
        """Create a new catalog item.

        Access pattern: PUT PK=CATALOG#{name}, SK=ITEM#{slug}.
        """
        item = CatalogItemDynamo.from_create(catalog_name, data, slug_override)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get(self, catalog_name: str, slug: str) -> CatalogItemDynamo:
        """Get a specific catalog item.

        Access pattern: GET PK=CATALOG#{name}, SK=ITEM#{slug}.
        """
        raw = self.get_item(f"CATALOG#{catalog_name}", f"ITEM#{slug}")
        if raw is None:
            raise ResourceNotFoundException(
                f"Catalog item '{slug}' not found in '{catalog_name}'"
            )
        return CatalogItemDynamo.model_validate(raw)

    def list_all(
        self,
        catalog_name: str,
        include_inactive: bool = False,
        limit: int = 100,
    ) -> list[CatalogItemDynamo]:
        """List all items in a catalog, sorted by sort_order.

        Access pattern: GSI1 PK=CATALOG#{name}, SK begins_with ORDER#.
        """
        items, _ = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value=f"CATALOG#{catalog_name}",
            sk_name="GSI1SK",
            sk_begins_with="ORDER#",
            limit=limit,
        )
        result = [CatalogItemDynamo.model_validate(i) for i in items]
        if not include_inactive:
            result = [i for i in result if i.is_active]
        return result

    def update(
        self,
        catalog_name: str,
        slug: str,
        data: CatalogItemUpdate,
    ) -> CatalogItemDynamo:
        """Update a catalog item.

        Access pattern: UPDATE PK=CATALOG#{name}, SK=ITEM#{slug}.
        """
        existing = self.get(catalog_name, slug)

        updates: dict[str, Any] = {"updated_at": utc_now().isoformat()}
        if data.label is not None:
            updates["label"] = data.label
        if data.color is not None:
            updates["color"] = data.color
        if data.sort_order is not None:
            updates["sort_order"] = data.sort_order
            updates["GSI1SK"] = f"ORDER#{data.sort_order:04d}#{slug}"
        if data.is_active is not None:
            updates["is_active"] = data.is_active

        raw = self.update_item(existing.PK, existing.SK, updates)
        return CatalogItemDynamo.model_validate(raw)

    def delete(self, catalog_name: str, slug: str) -> None:
        """Hard-delete a catalog item.

        Prefer soft-delete via update(is_active=False) for items already in use.
        """
        self.delete_item(f"CATALOG#{catalog_name}", f"ITEM#{slug}")

    def exists(self, catalog_name: str, slug: str) -> bool:
        """Check if a catalog item exists."""
        raw = self.get_item(f"CATALOG#{catalog_name}", f"ITEM#{slug}")
        return raw is not None
