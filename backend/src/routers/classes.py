"""Classes router — endpoints for fitness class session management."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.class_model import ClassCreate, ClassResponse, ClassUpdate
from src.models.common import MessageResponse, PaginatedResponse
from src.services.class_service import ClassService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/classes", tags=["Classes"])


def get_service() -> ClassService:
    """Dependency: return a ClassService instance."""
    return ClassService()


@router.post(
    "",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Class",
    description="Create a new fitness class session with date, time, capacity, and instructor.",
)
def create_class(
    data: ClassCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> ClassResponse:
    """Create a new class session."""
    return service.create_class(data)


@router.get(
    "",
    response_model=PaginatedResponse[ClassResponse],
    summary="List Classes",
    description=(
        "List all class sessions. Filter by date or date range. "
        "Use upcoming_only=true to show only future classes."
    ),
)
def list_classes(
    date: str | None = Query(default=None, description="Filter by specific date (YYYY-MM-DD)"),
    start_date: str | None = Query(default=None, description="Range start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="Range end date (YYYY-MM-DD)"),
    upcoming_only: bool = Query(default=False, description="Only return future classes"),
    limit: int = Query(default=50, ge=1, le=200),
    last_key: str | None = Query(default=None, description="Pagination token"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> PaginatedResponse[ClassResponse]:
    """List class sessions with optional filters."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_classes(
        date_filter=date,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        last_evaluated_key=last_evaluated_key,
        upcoming_only=upcoming_only,
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
    "/{class_id}",
    response_model=ClassResponse,
    summary="Get Class",
    description="Get full details for a specific class session including capacity and reservation count.",
)
def get_class(
    class_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> ClassResponse:
    """Get a class by ID."""
    return service.get_class(class_id)


@router.patch(
    "/{class_id}",
    response_model=ClassResponse,
    summary="Update Class",
    description="Partially update a class session's details.",
)
def update_class(
    class_id: str,
    data: ClassUpdate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> ClassResponse:
    """Update a class session."""
    return service.update_class(class_id, data)


@router.post(
    "/{class_id}/cancel",
    response_model=ClassResponse,
    summary="Cancel Class",
    description="Mark a class as cancelled. Students with reservations should be notified separately.",
)
def cancel_class(
    class_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> ClassResponse:
    """Cancel a class session."""
    return service.cancel_class(class_id)


@router.delete(
    "/{class_id}",
    response_model=MessageResponse,
    summary="Delete Class",
    description="Permanently delete a class session. Prefer cancellation for classes with reservations.",
)
def delete_class(
    class_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> MessageResponse:
    """Delete a class session."""
    service.delete_class(class_id)
    return MessageResponse(message=f"Class '{class_id}' deleted successfully.")
