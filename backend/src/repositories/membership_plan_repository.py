"""Membership plan repository — DynamoDB access patterns for membership plans."""

import json
from decimal import Decimal
from typing import Any

from src.models.common import utc_now
from src.models.membership_plan import PlanCreate, PlanDynamoItem, PlanUpdate
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class MembershipPlanRepository(DynamoRepository):
    """Data access layer for admin-configurable membership plans."""

    _PK = "MEMBERSHIP_PLANS"

    def create(self, data: PlanCreate, slug_override: str | None = None) -> PlanDynamoItem:
        """Create a new membership plan.

        Access pattern: PUT PK=MEMBERSHIP_PLANS, SK=PLAN#{slug}.
        """
        item = PlanDynamoItem.from_create(data, slug_override)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_by_slug(self, slug: str) -> PlanDynamoItem:
        """Get a specific plan by slug.

        Access pattern: GET PK=MEMBERSHIP_PLANS, SK=PLAN#{slug}.
        """
        raw = self.get_item(self._PK, f"PLAN#{slug}")
        if raw is None:
            raise ResourceNotFoundException(f"Membership plan '{slug}' not found")
        return PlanDynamoItem.model_validate(raw)

    def get_by_slug_or_none(self, slug: str) -> PlanDynamoItem | None:
        """Get a plan by slug, returning None if not found."""
        raw = self.get_item(self._PK, f"PLAN#{slug}")
        if raw is None:
            return None
        return PlanDynamoItem.model_validate(raw)

    def list_all(
        self,
        include_inactive: bool = False,
        limit: int = 100,
    ) -> list[PlanDynamoItem]:
        """List all plans sorted by sort_order.

        Access pattern: GSI1 PK=MEMBERSHIP_PLANS, SK begins_with ORDER#.
        """
        items, _ = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value=self._PK,
            sk_name="GSI1SK",
            sk_begins_with="ORDER#",
            limit=limit,
        )
        result = [PlanDynamoItem.model_validate(i) for i in items]
        if not include_inactive:
            result = [i for i in result if i.is_active]
        return result

    def update(self, slug: str, data: PlanUpdate) -> PlanDynamoItem:
        """Update a membership plan.

        Access pattern: UPDATE PK=MEMBERSHIP_PLANS, SK=PLAN#{slug}.
        """
        existing = self.get_by_slug(slug)

        updates: dict[str, Any] = {"updated_at": utc_now().isoformat()}
        if data.label is not None:
            updates["label"] = data.label
        if data.description is not None:
            updates["description"] = data.description
        if data.default_price is not None:
            updates["default_price"] = data.default_price
        if data.duration_days is not None:
            updates["duration_days"] = data.duration_days
        if data.sessions_per_day is not None:
            updates["sessions_per_day"] = data.sessions_per_day
        if data.total_sessions is not None:
            updates["total_sessions"] = data.total_sessions
        if data.clear_total_sessions:
            updates["total_sessions"] = None
        if data.allowed_days is not None:
            updates["allowed_days"] = data.allowed_days
        if data.blocked_schedules is not None:
            updates["blocked_schedules"] = [bs.model_dump() for bs in data.blocked_schedules]
        if data.requires_partner is not None:
            updates["requires_partner"] = data.requires_partner
        if data.sort_order is not None:
            updates["sort_order"] = data.sort_order
            updates["GSI1SK"] = f"ORDER#{data.sort_order:04d}#{slug}"
        if data.is_active is not None:
            updates["is_active"] = data.is_active

        raw = self.update_item(existing.PK, existing.SK, updates)
        return PlanDynamoItem.model_validate(raw)

    def delete(self, slug: str) -> None:
        """Hard-delete a plan. Prefer soft-delete via update(is_active=False)."""
        self.delete_item(self._PK, f"PLAN#{slug}")

    def exists(self, slug: str) -> bool:
        """Check if a plan exists by slug."""
        raw = self.get_item(self._PK, f"PLAN#{slug}")
        return raw is not None
