"""Membership plans router — CRUD for admin-configurable membership plans."""

from typing import Any

from aws_lambda_powertools import Logger
from fastapi import APIRouter, Depends, Path, Query, status

from src.models.membership_plan import PlanCreate, PlanResponse, PlanUpdate
from src.services.membership_plan_service import MembershipPlanService
from src.utils.auth import get_current_user, require_admin_only

logger = Logger()

router = APIRouter(prefix="/membership-plans", tags=["Membership Plans"])


def _service() -> MembershipPlanService:
    """Dependency: return a MembershipPlanService instance."""
    return MembershipPlanService()


# ── List ─────────────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[PlanResponse],
    summary="List Membership Plans",
    description="Return all active membership plans, sorted by sort_order.",
)
def list_plans(
    include_inactive: bool = Query(
        default=False, description="Include deactivated plans",
    ),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipPlanService = Depends(_service),
) -> list[PlanResponse]:
    """List all membership plans."""
    return service.list_plans(include_inactive=include_inactive)


# ── Get ──────────────────────────────────────────────────────────────────────


@router.get(
    "/{slug}",
    response_model=PlanResponse,
    summary="Get Membership Plan",
    description="Get a specific membership plan by its slug.",
)
def get_plan(
    slug: str = Path(..., description="Plan slug"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipPlanService = Depends(_service),
) -> PlanResponse:
    """Get a membership plan by slug."""
    return service.get_plan(slug)


# ── Create ───────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Membership Plan",
    description="Create a new membership plan.",
    dependencies=[Depends(require_admin_only())],
)
def create_plan(
    data: PlanCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipPlanService = Depends(_service),
) -> PlanResponse:
    """Create a new membership plan."""
    return service.create_plan(data)


# ── Update ───────────────────────────────────────────────────────────────────


@router.patch(
    "/{slug}",
    response_model=PlanResponse,
    summary="Update Membership Plan",
    description="Update an existing membership plan. Only provided fields are changed.",
    dependencies=[Depends(require_admin_only())],
)
def update_plan(
    data: PlanUpdate,
    slug: str = Path(..., description="Plan slug"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipPlanService = Depends(_service),
) -> PlanResponse:
    """Update a membership plan."""
    return service.update_plan(slug, data)


# ── Delete (soft) ────────────────────────────────────────────────────────────


@router.delete(
    "/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate Membership Plan",
    description="Soft-delete a plan by marking it inactive. Existing memberships are unaffected.",
    dependencies=[Depends(require_admin_only())],
)
def delete_plan(
    slug: str = Path(..., description="Plan slug"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipPlanService = Depends(_service),
) -> None:
    """Deactivate a membership plan."""
    service.delete_plan(slug)


# ── Seed ─────────────────────────────────────────────────────────────────────


@router.post(
    "/seed",
    response_model=list[PlanResponse],
    summary="Seed Default Plans",
    description=(
        "One-time migration: create the 8 standard membership plans. "
        "Idempotent — existing plans are left untouched."
    ),
    dependencies=[Depends(require_admin_only())],
)
def seed_plans(
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipPlanService = Depends(_service),
) -> list[PlanResponse]:
    """Seed default membership plans."""
    return service.seed_default_plans()
