"""Membership plan service — business logic for admin-configurable plans."""

from aws_lambda_powertools import Logger

from src.models.membership_plan import (
    PlanCreate,
    PlanDynamoItem,
    PlanResponse,
    PlanUpdate,
    slugify,
)
from src.repositories.membership_plan_repository import MembershipPlanRepository
from src.utils.exceptions import raise_bad_request, raise_conflict

logger = Logger()


# ── Seed data — mirrors the current hardcoded MembershipType enum ───────────

SEED_PLANS: list[dict] = [
    {
        "slug": "founder",
        "label": "Socio Fundador",
        "description": "Membresía fundador — 1 sesión/día L-S (AGOTADO)",
        "default_price": 950,
        "duration_days": 30,
        "sessions_per_day": 1,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 0,
    },
    {
        "slug": "room_daily",
        "label": "Room Daily",
        "description": "1 sesión/día de lunes a sábado",
        "default_price": 1300,
        "duration_days": 30,
        "sessions_per_day": 1,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 1,
    },
    {
        "slug": "room_elite",
        "label": "Room Elite",
        "description": "Sesiones ilimitadas de lunes a sábado",
        "default_price": 1600,
        "duration_days": 30,
        "sessions_per_day": 0,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 2,
    },
    {
        "slug": "room_flex",
        "label": "Room Flex",
        "description": "12 sesiones por mes",
        "default_price": 1150,
        "duration_days": 60,
        "sessions_per_day": 1,
        "total_sessions": 12,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 3,
    },
    {
        "slug": "room_pass",
        "label": "Room Pass",
        "description": "Pase de 1 sesión — mismo día",
        "default_price": 150,
        "duration_days": 1,
        "sessions_per_day": 1,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 4,
    },
    {
        "slug": "room_duo",
        "label": "Room Dúo",
        "description": "Membresía pareja — 1 sesión/día, renovación ligada",
        "default_price": 1100,
        "duration_days": 30,
        "sessions_per_day": 1,
        "requires_partner": True,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 5,
    },
    {
        "slug": "kilo_a_kilo",
        "label": "Kilo a Kilo",
        "description": "Programa 90 días — un solo pago",
        "default_price": 3000,
        "duration_days": 90,
        "sessions_per_day": 1,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat"],
        "sort_order": 6,
    },
    {
        "slug": "courtesy",
        "label": "Cortesía",
        "description": "Duración configurable, ilimitado (regalos/staff)",
        "default_price": 0,
        "duration_days": 30,
        "sessions_per_day": 0,
        "allowed_days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        "sort_order": 7,
    },
]


class MembershipPlanService:
    """Service for membership plan business logic."""

    def __init__(
        self,
        plan_repo: MembershipPlanRepository | None = None,
    ) -> None:
        self._plan_repo = plan_repo or MembershipPlanRepository()

    def create_plan(self, data: PlanCreate) -> PlanResponse:
        """Create a new membership plan.

        Args:
            data: Validated plan creation payload.

        Returns:
            The created plan response.
        """
        slug = slugify(data.label)
        if self._plan_repo.exists(slug):
            raise_conflict(f"A plan with slug '{slug}' already exists.")

        logger.info("Creating membership plan", extra={"slug": slug})
        item = self._plan_repo.create(data, slug_override=slug)
        return item.to_response()

    def get_plan(self, slug: str) -> PlanResponse:
        """Get a plan by slug."""
        item = self._plan_repo.get_by_slug(slug)
        return item.to_response()

    def get_plan_or_none(self, slug: str) -> PlanDynamoItem | None:
        """Get a plan DynamoDB item by slug, or None if not found.

        Used internally by other services that need the raw plan data.
        """
        return self._plan_repo.get_by_slug_or_none(slug)

    def list_plans(self, include_inactive: bool = False) -> list[PlanResponse]:
        """List all plans sorted by sort_order."""
        items = self._plan_repo.list_all(include_inactive=include_inactive)
        return [i.to_response() for i in items]

    def update_plan(self, slug: str, data: PlanUpdate) -> PlanResponse:
        """Update an existing plan.

        Args:
            slug: Plan slug to update.
            data: Partial update payload.

        Returns:
            The updated plan response.
        """
        logger.info("Updating membership plan", extra={"slug": slug})
        item = self._plan_repo.update(slug, data)
        return item.to_response()

    def delete_plan(self, slug: str) -> None:
        """Soft-delete a plan by marking it inactive.

        Prefer this over hard-delete since existing memberships reference the slug.
        """
        logger.info("Deactivating membership plan", extra={"slug": slug})
        self._plan_repo.update(slug, PlanUpdate(is_active=False))

    def seed_default_plans(self) -> list[PlanResponse]:
        """Seed the default membership plans (idempotent).

        Creates the 8 standard plans if they don't already exist.
        Existing plans are left untouched.

        Returns:
            List of all plan responses (both created and pre-existing).
        """
        logger.info("Seeding default membership plans")
        results: list[PlanResponse] = []

        for plan_data in SEED_PLANS:
            slug = plan_data["slug"]
            existing = self._plan_repo.get_by_slug_or_none(slug)
            if existing:
                logger.info("Plan already exists, skipping", extra={"slug": slug})
                results.append(existing.to_response())
                continue

            create_data = PlanCreate(
                label=plan_data["label"],
                description=plan_data.get("description", ""),
                default_price=plan_data.get("default_price", 0),
                duration_days=plan_data.get("duration_days", 30),
                sessions_per_day=plan_data.get("sessions_per_day", 1),
                total_sessions=plan_data.get("total_sessions"),
                allowed_days=plan_data.get("allowed_days", ["mon", "tue", "wed", "thu", "fri", "sat"]),
                requires_partner=plan_data.get("requires_partner", False),
                sort_order=plan_data.get("sort_order", 0),
            )
            item = self._plan_repo.create(create_data, slug_override=slug)
            logger.info("Seeded plan", extra={"slug": slug})
            results.append(item.to_response())

        return results
