"""Memberships router — endpoints for membership management."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.common import PaginatedResponse
from src.models.membership import (
    FreezeMembershipRequest,
    MembershipCreate,
    MembershipResponse,
    MembershipUpdate,
)
from src.repositories.student_repository import StudentRepository
from src.services.event_notifier import EventNotifier
from src.services.membership_service import MembershipService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/memberships", tags=["Memberships"])


def get_service() -> MembershipService:
    """Dependency: return a MembershipService instance."""
    return MembershipService()


@router.post(
    "",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign Membership",
    description="Assign a new membership plan to a student. Student must not have an active membership.",  # noqa: E501
)
def assign_membership(
    data: MembershipCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse:
    """Assign a membership to a student."""
    result = service.assign_membership(data)
    try:
        repo = StudentRepository()
        item = repo.get_item(f"STUDENT#{data.student_id}", "PROFILE")
        if item and item.get("email"):
            name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip()
            EventNotifier().notify_membership_created(
                student_name=name,
                student_email=item["email"],
                student_phone=item.get("phone"),
                membership_type=data.membership_type,
                start_date=str(data.start_date),
                end_date=str(result.end_date),
            )
    except Exception:
        pass
    return result


@router.get(
    "/expiring-soon",
    response_model=list[MembershipResponse],
    summary="List Expiring Memberships",
    description="List all active memberships expiring within the next N days. Useful for renewal alerts.",  # noqa: E501
)
def list_expiring_soon(
    days: int = Query(default=7, ge=1, le=90, description="Number of days ahead to check"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> list[MembershipResponse]:
    """List memberships expiring soon."""
    items, _ = service.list_expiring_soon(days=days)
    return items


@router.get(
    "/student/{student_id}",
    response_model=PaginatedResponse[MembershipResponse],
    summary="List Student Memberships",
    description="List all memberships (active and historical) for a specific student.",
)
def list_memberships_for_student(
    student_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    last_key: str | None = Query(default=None, description="Pagination token"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> PaginatedResponse[MembershipResponse]:
    """List all memberships for a student."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_memberships_for_student(
        student_id, limit=limit, last_evaluated_key=last_evaluated_key
    )
    return PaginatedResponse(
        items=items,
        total=len(items),
        page=1,
        page_size=limit,
        has_more=next_key is not None,
        last_evaluated_key=next_key.get("PK") if next_key else None,
    )


@router.get(
    "/student/{student_id}/active",
    response_model=MembershipResponse | None,
    summary="Get Active Membership",
    description="Get the currently active membership for a student. Returns null if none exists.",
)
def get_active_membership(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse | None:
    """Get the active membership for a student."""
    return service.get_active_membership(student_id)


@router.get(
    "/student/{student_id}/{membership_id}",
    response_model=MembershipResponse,
    summary="Get Membership",
    description="Get a specific membership by student ID and membership ID.",
)
def get_membership(
    student_id: str,
    membership_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse:
    """Get a specific membership."""
    return service.get_membership(student_id, membership_id)


@router.patch(
    "/student/{student_id}/{membership_id}",
    response_model=MembershipResponse,
    summary="Update Membership",
    description="Update membership details such as expiry date or class count.",
)
def update_membership(
    student_id: str,
    membership_id: str,
    data: MembershipUpdate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse:
    """Update a membership."""
    return service.update_membership(student_id, membership_id, data)


@router.post(
    "/student/{student_id}/{membership_id}/cancel",
    response_model=MembershipResponse,
    summary="Cancel Membership",
    description="Cancel an active membership. The student will no longer have access.",
)
def cancel_membership(
    student_id: str,
    membership_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse:
    """Cancel a membership."""
    return service.cancel_membership(student_id, membership_id)


@router.post(
    "/student/{student_id}/{membership_id}/freeze",
    response_model=MembershipResponse,
    summary="Freeze Membership",
    description="Freeze an active membership for N days (max 180). Expiry date is extended by the same number of days. Useful for injuries, travel, or illness.",  # noqa: E501
)
def freeze_membership(
    student_id: str,
    membership_id: str,
    data: FreezeMembershipRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse:
    """Freeze a membership."""
    result = service.freeze_membership(student_id, membership_id, data)
    try:
        repo = StudentRepository()
        item = repo.get_item(f"STUDENT#{student_id}", "PROFILE")
        if item and item.get("email"):
            name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip()
            EventNotifier().notify_membership_frozen(
                student_name=name,
                student_email=item["email"],
                student_phone=item.get("phone"),
                freeze_days=data.days,
            )
    except Exception:
        pass
    return result


@router.post(
    "/student/{student_id}/{membership_id}/unfreeze",
    response_model=MembershipResponse,
    summary="Unfreeze Membership",
    description="Unfreeze a frozen membership, restoring it to active status.",
)
def unfreeze_membership(
    student_id: str,
    membership_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: MembershipService = Depends(get_service),
) -> MembershipResponse:
    """Unfreeze a membership."""
    result = service.unfreeze_membership(student_id, membership_id)
    try:
        repo = StudentRepository()
        item = repo.get_item(f"STUDENT#{student_id}", "PROFILE")
        if item and item.get("email"):
            name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip()
            EventNotifier().notify_membership_unfrozen(
                student_name=name,
                student_email=item["email"],
                student_phone=item.get("phone"),
                new_end_date=str(result.end_date),
            )
    except Exception:
        pass
    return result
