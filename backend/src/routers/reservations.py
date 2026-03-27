"""Reservations router — endpoints for class reservations and waitlist."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.common import PaginatedResponse
from src.models.reservation import ReservationCreate, ReservationResponse
from src.services.reservation_service import ReservationService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/reservations", tags=["Reservations"])


def get_service() -> ReservationService:
    """Dependency: return a ReservationService instance."""
    return ReservationService()


@router.post(
    "",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Reservation",
    description=(
        "Reserve a spot in a class for a student. "
        "If the class is full, the student is automatically added to the waitlist. "
        "The response status field indicates 'confirmed' or 'waitlisted'."
    ),
)
def create_reservation(
    data: ReservationCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReservationService = Depends(get_service),
) -> ReservationResponse:
    """Create a reservation or add to waitlist."""
    return service.create_reservation(data)


@router.get(
    "/class/{class_id}",
    response_model=PaginatedResponse[ReservationResponse],
    summary="List Class Reservations",
    description="List all confirmed reservations for a specific class session.",
)
def list_reservations_for_class(
    class_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    last_key: str | None = Query(default=None, description="Pagination token"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReservationService = Depends(get_service),
) -> PaginatedResponse[ReservationResponse]:
    """List reservations for a class."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_reservations_for_class(
        class_id, limit=limit, last_evaluated_key=last_evaluated_key
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
    "/class/{class_id}/waitlist",
    response_model=list[ReservationResponse],
    summary="Get Class Waitlist",
    description="Get the ordered waitlist for a class. Students are listed by position (1 = next to be promoted).",  # noqa: E501
)
def get_waitlist_for_class(
    class_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReservationService = Depends(get_service),
) -> list[ReservationResponse]:
    """Get the waitlist for a class."""
    return service.get_waitlist_for_class(class_id, limit=limit)


@router.get(
    "/student/{student_id}",
    response_model=PaginatedResponse[ReservationResponse],
    summary="List Student Reservations",
    description="List all reservations (past and upcoming) for a specific student.",
)
def list_reservations_for_student(
    student_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    last_key: str | None = Query(default=None, description="Pagination token"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReservationService = Depends(get_service),
) -> PaginatedResponse[ReservationResponse]:
    """List reservations for a student."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_reservations_for_student(
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


@router.delete(
    "/class/{class_id}/student/{student_id}",
    response_model=ReservationResponse,
    summary="Cancel Reservation",
    description=(
        "Cancel a student's confirmed reservation. "
        "The first student on the waitlist is automatically promoted to a confirmed spot."
    ),
)
def cancel_reservation(
    class_id: str,
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReservationService = Depends(get_service),
) -> ReservationResponse:
    """Cancel a reservation."""
    return service.cancel_reservation(class_id, student_id)


@router.post(
    "/class/{class_id}/student/{student_id}/attendance",
    response_model=ReservationResponse,
    summary="Mark Attendance",
    description="Mark a student as attended or no-show for a class session.",
)
def mark_attendance(
    class_id: str,
    student_id: str,
    attended: bool = Query(..., description="True if student attended, False for no-show"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ReservationService = Depends(get_service),
) -> ReservationResponse:
    """Mark student attendance."""
    return service.mark_attendance(class_id, student_id, attended)
