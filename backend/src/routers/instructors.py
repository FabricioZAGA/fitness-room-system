"""API routes for instructor management."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.common import MessageResponse, PaginatedResponse
from src.models.instructor import (
    InstructorCreate,
    InstructorResponse,
    InstructorStatus,
    InstructorUpdate,
)
from src.services.instructor_service import InstructorService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/instructors", tags=["Instructors"])


def get_service() -> InstructorService:
    """Dependency: return an InstructorService instance."""
    return InstructorService()


@router.post(
    "",
    response_model=InstructorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Instructor",
    description="Register a new instructor in the system.",
)
def create_instructor(
    data: InstructorCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> InstructorResponse:
    """Create a new instructor."""
    return service.create_instructor(data)


@router.get(
    "",
    response_model=PaginatedResponse[InstructorResponse],
    summary="List Instructors",
    description="List all instructors, optionally filtered by status.",
)
def list_instructors(
    status: InstructorStatus | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    last_key: str | None = Query(default=None, description="Pagination token"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> PaginatedResponse[InstructorResponse]:
    """List instructors."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_instructors(
        status=status, limit=limit, last_evaluated_key=last_evaluated_key
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
    "/{instructor_id}",
    response_model=InstructorResponse,
    summary="Get Instructor",
    description="Get an instructor's profile by ID.",
)
def get_instructor(
    instructor_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> InstructorResponse:
    """Get an instructor by ID."""
    return service.get_instructor(instructor_id)


@router.patch(
    "/{instructor_id}",
    response_model=InstructorResponse,
    summary="Update Instructor",
    description="Update an instructor's profile.",
)
def update_instructor(
    instructor_id: str,
    data: InstructorUpdate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> InstructorResponse:
    """Update an instructor."""
    return service.update_instructor(instructor_id, data)


@router.post(
    "/{instructor_id}/activate",
    response_model=InstructorResponse,
    summary="Activate Instructor",
    description="Reactivate an inactive instructor.",
)
def activate_instructor(
    instructor_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> InstructorResponse:
    """Activate an instructor."""
    return service.activate_instructor(instructor_id)


@router.post(
    "/{instructor_id}/deactivate",
    response_model=InstructorResponse,
    summary="Deactivate Instructor",
    description="Mark an instructor as inactive.",
)
def deactivate_instructor(
    instructor_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> InstructorResponse:
    """Deactivate an instructor."""
    return service.deactivate_instructor(instructor_id)


@router.delete(
    "/{instructor_id}",
    response_model=MessageResponse,
    summary="Delete Instructor",
    description="Permanently delete an instructor.",
)
def delete_instructor(
    instructor_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InstructorService = Depends(get_service),
) -> MessageResponse:
    """Delete an instructor."""
    service.delete_instructor(instructor_id)
    return MessageResponse(message=f"Instructor '{instructor_id}' deleted successfully.")
