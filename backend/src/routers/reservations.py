"""Reservations router — endpoints for class reservations and waitlist."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.common import PaginatedResponse
from src.models.reservation import ReservationCreate, ReservationResponse
from src.repositories.class_repository import ClassRepository
from src.repositories.student_repository import StudentRepository
from src.services.event_notifier import EventNotifier
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
    result = service.create_reservation(data)
    # Send notifications
    try:
        notifier = EventNotifier()
        stu_repo = StudentRepository()
        cls_repo = ClassRepository()
        s_item = stu_repo.get_item(f"STUDENT#{data.student_id}", "PROFILE")
        cls = cls_repo.get_by_id(data.class_id)
        if s_item and s_item.get("email"):
            sname = f"{s_item.get('first_name', '')} {s_item.get('last_name', '')}".strip()
            if result.status == "confirmed":
                notifier.notify_reservation_confirmed(
                    student_name=sname,
                    student_email=s_item["email"],
                    student_phone=s_item.get("phone"),
                    class_type=cls.class_type,
                    class_date=cls.class_date,
                    start_time=cls.start_time,
                    instructor_name=cls.instructor_name,
                    location=cls.location or "",
                )
            elif result.status == "waitlisted":
                notifier.notify_waitlist_joined(
                    student_name=sname,
                    student_email=s_item["email"],
                    student_phone=s_item.get("phone"),
                    class_type=cls.class_type,
                    class_date=cls.class_date,
                    start_time=cls.start_time,
                    position=result.waitlist_position or 1,
                )
            # Notify instructor
            inst = notifier.resolve_instructor_for_class(cls.instructor_name)
            if inst and result.status == "confirmed":
                updated = cls_repo.get_by_id(data.class_id)
                notifier.notify_instructor_student_enrolled(
                    instructor_name=inst["name"],
                    instructor_email=inst["email"],
                    instructor_phone=inst.get("phone"),
                    student_name=sname,
                    class_type=cls.class_type,
                    class_date=cls.class_date,
                    start_time=cls.start_time,
                    reservations_count=updated.reservations_count,
                    capacity=updated.capacity,
                )
    except Exception:
        pass
    return result


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
    result, promoted_student_id = service.cancel_reservation(class_id, student_id)
    # Send notifications
    try:
        notifier = EventNotifier()
        stu_repo = StudentRepository()
        cls_repo = ClassRepository()
        cls = cls_repo.get_by_id(class_id)
        s_item = stu_repo.get_item(f"STUDENT#{student_id}", "PROFILE")
        if s_item and s_item.get("email"):
            sname = f"{s_item.get('first_name', '')} {s_item.get('last_name', '')}".strip()
            notifier.notify_reservation_cancelled(
                student_name=sname,
                student_email=s_item["email"],
                student_phone=s_item.get("phone"),
                class_type=cls.class_type,
                class_date=cls.class_date,
                start_time=cls.start_time,
            )
        # Notify instructor with current counts
        inst = notifier.resolve_instructor_for_class(cls.instructor_name)
        updated = cls_repo.get_by_id(class_id)
        if inst:
            sname = ""
            if s_item:
                sname = f"{s_item.get('first_name', '')} {s_item.get('last_name', '')}".strip()
            notifier.notify_instructor_student_cancelled(
                instructor_name=inst["name"],
                instructor_email=inst["email"],
                instructor_phone=inst.get("phone"),
                student_name=sname or "Alumno",
                class_type=cls.class_type,
                class_date=cls.class_date,
                start_time=cls.start_time,
                reservations_count=updated.reservations_count,
                capacity=updated.capacity,
            )
        # Notify promoted student from waitlist
        if promoted_student_id:
            p_item = stu_repo.get_item(f"STUDENT#{promoted_student_id}", "PROFILE")
            if p_item and p_item.get("email"):
                pname = f"{p_item.get('first_name', '')} {p_item.get('last_name', '')}".strip()
                notifier.notify_waitlist_promoted(
                    student_name=pname,
                    student_email=p_item["email"],
                    student_phone=p_item.get("phone"),
                    class_type=cls.class_type,
                    class_date=cls.class_date,
                    start_time=cls.start_time,
                )
    except Exception:
        pass
    return result


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
