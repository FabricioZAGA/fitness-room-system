"""Classes router — endpoints for fitness class session management."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.class_model import ClassCreate, ClassResponse, ClassUpdate
from src.models.common import MessageResponse, PaginatedResponse
from src.services.class_service import ClassService
from src.services.event_notifier import EventNotifier
from src.repositories.reservation_repository import ReservationRepository
from src.repositories.student_repository import StudentRepository
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
    result = service.create_class(data)
    # Notify instructor about new class assignment
    try:
        notifier = EventNotifier()
        inst = notifier.resolve_instructor_for_class(result.instructor_name)
        if inst:
            notifier.notify_instructor_class_assigned(
                instructor_name=inst["name"],
                instructor_email=inst["email"],
                instructor_phone=inst.get("phone"),
                class_type=result.class_type,
                class_date=result.class_date,
                start_time=result.start_time,
                duration_minutes=result.duration_minutes,
                location=result.location or "",
            )
    except Exception:
        pass
    return result


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
    description="Get full details for a specific class session including capacity and reservation count.",  # noqa: E501
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
    description="Mark a class as cancelled. Students with reservations should be notified separately.",  # noqa: E501
)
def cancel_class(
    class_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> ClassResponse:
    """Cancel a class session."""
    result = service.cancel_class(class_id)
    try:
        notifier = EventNotifier()
        # Notify instructor
        inst = notifier.resolve_instructor_for_class(result.instructor_name)
        if inst:
            notifier.notify_instructor_class_cancelled(
                instructor_name=inst["name"],
                instructor_email=inst["email"],
                instructor_phone=inst.get("phone"),
                class_type=result.class_type,
                class_date=result.class_date,
                start_time=result.start_time,
            )
        # Notify all enrolled students
        res_repo = ReservationRepository()
        stu_repo = StudentRepository()
        reservations, _ = res_repo.list_for_class(class_id, limit=200)
        enrolled = [
            r for r in reservations
            if r.status in ("confirmed", "waitlisted")
        ]
        students_to_notify: list[dict[str, str | None]] = []
        for r in enrolled:
            sid = r.student_id
            s_item = stu_repo.get_item(f"STUDENT#{sid}", "PROFILE")
            if s_item and s_item.get("email"):
                students_to_notify.append({
                    "name": f"{s_item.get('first_name', '')} {s_item.get('last_name', '')}".strip(),
                    "email": s_item.get("email"),
                    "phone": s_item.get("phone"),
                })
        if students_to_notify:
            notifier.notify_class_cancelled_to_students(
                students=students_to_notify,
                class_type=result.class_type,
                class_date=result.class_date,
                start_time=result.start_time,
                instructor_name=result.instructor_name,
            )
    except Exception:
        pass
    return result


@router.delete(
    "/{class_id}",
    response_model=MessageResponse,
    summary="Delete Class",
    description="Permanently delete a class session. Prefer cancellation for classes with reservations.",  # noqa: E501
)
def delete_class(
    class_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: ClassService = Depends(get_service),
) -> MessageResponse:
    """Delete a class session."""
    service.delete_class(class_id)
    return MessageResponse(message=f"Class '{class_id}' deleted successfully.")
