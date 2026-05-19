"""Portal router — self-service endpoints for students and instructors."""

from __future__ import annotations

import base64
from datetime import date, datetime, timedelta
from io import BytesIO
from typing import Any
from zoneinfo import ZoneInfo

from src.models.common import mexico_today

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ..models.class_model import ClassDynamoItem
from ..models.reservation import ReservationCreate
from ..models.student import StudentDynamoItem
from ..repositories.class_repository import ClassRepository
from ..repositories.instructor_repository import InstructorRepository
from ..repositories.membership_repository import MembershipRepository
from ..repositories.reservation_repository import ReservationRepository
from ..repositories.student_repository import StudentRepository
from ..services.event_notifier import EventNotifier
from ..utils.auth import require_student_or_staff_group
from ..utils.exceptions import ResourceNotFoundException

router = APIRouter(prefix="/portal", tags=["portal"])

# Minimum minutes before class start to allow self-service cancellation
CANCELLATION_CUTOFF_MINUTES = 15


# ---------------------------------------------------------------------------
# Dependency factories
# ---------------------------------------------------------------------------

def get_student_repository() -> StudentRepository:
    return StudentRepository()


def get_membership_repository() -> MembershipRepository:
    return MembershipRepository()


def get_reservation_repository() -> ReservationRepository:
    return ReservationRepository()


def get_instructor_repository() -> InstructorRepository:
    return InstructorRepository()


def get_class_repository() -> ClassRepository:
    return ClassRepository()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_user_role(current_user: dict[str, Any]) -> str:
    """Return 'staff' if user belongs to the staff/teacher Cognito group, else 'student'."""
    groups = current_user.get("cognito:groups", [])
    if "staff" in groups or "teacher" in groups:
        return "staff"
    return "student"


def _find_student_by_email(
    email: str,
    student_repo: StudentRepository,
) -> StudentDynamoItem | None:
    """Find a student record by email (scan GSI1, filter by email)."""
    items, _ = student_repo.list_all(limit=1000)
    for item in items:
        if item.email == email:
            return item
    return None


def _resolve_student(
    current_user: dict[str, Any],
    student_repo: StudentRepository,
) -> StudentDynamoItem:
    """Resolve the student DynamoDB record for the current Cognito user.

    Tries lookup by Cognito sub first (student_id == sub),
    then falls back to email-based lookup.
    """
    user_id = current_user.get("sub")
    email = current_user.get("email", "")

    # Try direct lookup (student_id == cognito sub)
    if user_id:
        try:
            return student_repo.get_by_id(user_id)
        except ResourceNotFoundException:
            pass

    # Fallback: lookup by email
    if email:
        student = _find_student_by_email(email, student_repo)
        if student is not None:
            return student

    raise ResourceNotFoundException("Student profile not found")


def _can_cancel_reservation(
    class_item: ClassDynamoItem,
) -> tuple[bool, str]:
    """Check if a reservation can be cancelled (15-min cutoff before class start)."""
    try:
        class_datetime_str = f"{class_item.class_date}T{class_item.start_time}"
        mx_tz = ZoneInfo("America/Mexico_City")
        class_start = datetime.fromisoformat(class_datetime_str).replace(tzinfo=mx_tz)
        now = datetime.now(tz=mx_tz)
        minutes_until_class = (class_start - now).total_seconds() / 60

        if minutes_until_class < CANCELLATION_CUTOFF_MINUTES:
            return False, f"No puedes cancelar con menos de {CANCELLATION_CUTOFF_MINUTES} minutos de anticipación"
        return True, ""
    except (ValueError, TypeError):
        return True, ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/profile")
def get_profile(
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
) -> JSONResponse:
    """Return the current user's profile (student or instructor)."""
    user_id = current_user.get("sub") or ""
    role = get_user_role(current_user)

    try:
        if role == "student":
            student_profile = _resolve_student(current_user, student_repo)
            return JSONResponse(content={
                "role": "student",
                "student_id": student_profile.student_id,
                "first_name": student_profile.first_name,
                "last_name": student_profile.last_name,
                "email": student_profile.email,
                "phone": student_profile.phone,
                "status": student_profile.status,
                "created_at": student_profile.created_at.isoformat() if student_profile.created_at else None,
                "updated_at": student_profile.updated_at.isoformat() if student_profile.updated_at else None,
            })
        else:
            instructor_profile = instructor_repo.get_by_id(user_id)
            return JSONResponse(content={
                "role": "staff",
                "instructor_id": instructor_profile.instructor_id,
                "first_name": instructor_profile.first_name,
                "last_name": instructor_profile.last_name,
                "email": instructor_profile.email,
                "phone": instructor_profile.phone,
                "status": instructor_profile.status,
                "specialties": instructor_profile.specialties,
                "bio": instructor_profile.bio,
                "created_at": instructor_profile.created_at.isoformat() if instructor_profile.created_at else None,
                "updated_at": instructor_profile.updated_at.isoformat() if instructor_profile.updated_at else None,
            })
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}",
        )


@router.get("/membership")
def get_membership(
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
) -> JSONResponse:
    """Return the current student's active membership (staff always returns null)."""
    role = get_user_role(current_user)

    if role == "staff":
        return JSONResponse(content={"role": "staff", "membership": None})

    try:
        student = _resolve_student(current_user, student_repo)
        student_id = student.student_id
    except ResourceNotFoundException:
        return JSONResponse(content={"role": "student", "membership": None})

    try:
        membership = membership_repo.get_active_for_student(student_id)

        if not membership:
            return JSONResponse(content={"role": "student", "membership": None})

        days_until_expiry = None
        if membership.end_date:
            days_until_expiry = (date.fromisoformat(membership.end_date) - mexico_today()).days

        return JSONResponse(content={
            "role": "student",
            "membership": {
                "membership_id": membership.membership_id,
                "student_id": membership.student_id,
                "membership_type": membership.membership_type,
                "status": membership.status,
                "start_date": membership.start_date,
                "end_date": membership.end_date,
                "price_paid": float(membership.price_paid) if membership.price_paid else None,
                "days_until_expiry": days_until_expiry,
                "classes_remaining": membership.classes_remaining,
            },
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching membership: {str(e)}",
        )


@router.get("/qr")
def get_qr(
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
) -> JSONResponse:
    """Generate and return the current user's QR code as base64 PNG.

    IMPORTANT: For students, the QR encodes the *student_id* (DynamoDB key),
    NOT the Cognito sub.  This matches what the kiosk scanner expects.
    """
    user_id = current_user.get("sub") or ""
    role = get_user_role(current_user)

    try:
        if role == "student":
            student_user = _resolve_student(current_user, student_repo)
            user_name = f"{student_user.first_name} {student_user.last_name}"
            qr_data = student_user.student_id  # encode student_id for kiosk compatibility
        else:
            instructor_user = instructor_repo.get_by_id(user_id)
            user_name = f"{instructor_user.first_name} {instructor_user.last_name}"
            qr_data = user_id
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        qr = qrcode.QRCode(
            version=2,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_b64 = base64.b64encode(buffer.getvalue()).decode()

        return JSONResponse(content={
            "role": role,
            "user_id": qr_data,
            "user_name": user_name,
            "qr_base64": img_b64,
            "mime_type": "image/png",
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating QR code: {str(e)}",
        )


@router.get("/reservations")
def get_reservations(
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    status_filter: str | None = Query(None, description="Filter by status"),
) -> JSONResponse:
    """Return reservations for students or assigned classes for staff."""
    role = get_user_role(current_user)
    user_id = current_user.get("sub") or ""

    try:
        if role == "student":
            student = _resolve_student(current_user, student_repo)
            student_id = student.student_id
            reservations, _ = reservation_repo.list_for_student(student_id, limit=50)

            if status_filter:
                reservations = [r for r in reservations if r.status == status_filter]

            # Enrich each reservation with class details and cancellation policy
            items: list[dict[str, Any]] = []
            for r in reservations:
                item_data: dict[str, Any] = {
                    "reservation_id": r.reservation_id,
                    "student_id": r.student_id,
                    "class_id": r.class_id,
                    "class_date": r.class_date,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                # Add class info if available
                try:
                    cls = class_repo.get_by_id(r.class_id)
                    item_data["class_type"] = cls.class_type
                    item_data["start_time"] = cls.start_time
                    item_data["instructor_name"] = cls.instructor_name
                    item_data["location"] = cls.location
                    if r.status == "confirmed":
                        can_cancel, reason = _can_cancel_reservation(cls)
                        item_data["can_cancel"] = can_cancel
                        item_data["cancel_reason"] = reason
                    else:
                        item_data["can_cancel"] = False
                        item_data["cancel_reason"] = ""
                except ResourceNotFoundException:
                    item_data["can_cancel"] = False
                    item_data["cancel_reason"] = "Clase no encontrada"
                items.append(item_data)

            return JSONResponse(content={
                "role": "student",
                "items": items,
            })
        else:
            # Staff: list classes where this instructor is assigned.
            instructor = instructor_repo.get_by_id(user_id)
            name_slug = f"{instructor.first_name} {instructor.last_name}".lower().replace(" ", "_")
            classes, _ = class_repo.list_for_instructor(name_slug, limit=50)

            return JSONResponse(content={
                "role": "staff",
                "items": [
                    {
                        "class_id": c.class_id,
                        "class_name": c.class_type,
                        "class_date": c.class_date,
                        "start_time": c.start_time,
                        "instructor_id": user_id,
                        "instructor_name": c.instructor_name,
                        "location": c.location,
                        "capacity": c.capacity,
                        "reservations_count": c.reservations_count,
                        "status": "cancelled" if c.is_cancelled else "scheduled",
                    }
                    for c in classes
                ],
            })
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reservations: {str(e)}",
        )


@router.delete("/reservations/{class_id}")
def cancel_reservation(
    class_id: str,
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
) -> JSONResponse:
    """Cancel the calling student's reservation for a given class.

    Enforces 2-hour cancellation policy: students cannot cancel
    less than 2 hours before the class start time.
    """
    role = get_user_role(current_user)

    if role == "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff cannot cancel reservations",
        )

    try:
        student = _resolve_student(current_user, student_repo)
        student_id = student.student_id
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    try:
        reservation = reservation_repo.get_reservation(class_id, student_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found",
            )

        # Enforce 2-hour cancellation policy
        try:
            class_item = class_repo.get_by_id(class_id)
            can_cancel, reason = _can_cancel_reservation(class_item)
            if not can_cancel:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=reason,
                )
        except ResourceNotFoundException:
            pass  # Allow cancellation if class not found (edge case)

        # Use ReservationService for consistent cancel + waitlist promotion
        from src.services.reservation_service import ReservationService
        svc = ReservationService(
            reservation_repo=reservation_repo,
            class_repo=class_repo,
            student_repo=student_repo,
        )
        _, promoted_student_id = svc.cancel_reservation(class_id, student_id)

        student_name = f"{student.first_name} {student.last_name}".strip()
        notifier = EventNotifier()

        # Notify student about cancellation
        try:
            ci = class_repo.get_by_id(class_id)
            notifier.notify_reservation_cancelled(
                student_name=student_name,
                student_email=student.email or "",
                student_phone=student.phone,
                class_type=ci.class_type,
                class_date=ci.class_date,
                start_time=ci.start_time,
            )
            # Notify instructor about cancellation (counts already updated by service)
            inst = notifier.resolve_instructor_for_class(ci.instructor_name)
            if inst:
                updated = class_repo.get_by_id(class_id)
                notifier.notify_instructor_student_cancelled(
                    instructor_name=inst["name"],
                    instructor_email=inst["email"],
                    instructor_phone=inst.get("phone"),
                    student_name=student_name,
                    class_type=ci.class_type,
                    class_date=ci.class_date,
                    start_time=ci.start_time,
                    reservations_count=updated.reservations_count,
                    capacity=updated.capacity,
                )
            # Notify promoted student from waitlist
            if promoted_student_id:
                promoted_item = student_repo.get_item(
                    f"STUDENT#{promoted_student_id}", "PROFILE"
                )
                if promoted_item and promoted_item.get("email"):
                    pname = f"{promoted_item.get('first_name', '')} {promoted_item.get('last_name', '')}".strip()
                    notifier.notify_waitlist_promoted(
                        student_name=pname,
                        student_email=promoted_item["email"],
                        student_phone=promoted_item.get("phone"),
                        class_type=ci.class_type,
                        class_date=ci.class_date,
                        start_time=ci.start_time,
                    )
        except ResourceNotFoundException:
            pass

        return JSONResponse(content={"message": "Reservación cancelada exitosamente"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling reservation: {str(e)}",
        )


@router.get("/classes/{class_id}")
def get_class_detail(
    class_id: str,
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
) -> JSONResponse:
    """Return class details with instructor and enrolled classmates.

    Privacy: students only see first names and last initial of classmates.
    """
    try:
        cls = class_repo.get_by_id(class_id)
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    reservations, _ = reservation_repo.list_for_class(class_id, limit=500)

    confirmed: list[dict[str, Any]] = []
    waitlisted: list[dict[str, Any]] = []
    for r in reservations:
        if r.status not in ("confirmed", "attended", "waitlisted"):
            continue
        attendee: dict[str, Any] = {"status": r.status}
        try:
            item = student_repo.get_item(f"STUDENT#{r.student_id}", "PROFILE")
            if item:
                first = item.get("first_name", "")
                last = item.get("last_name", "")
                attendee["first_name"] = first
                attendee["last_initial"] = f"{last[0]}." if last else ""
            else:
                attendee["first_name"] = "Alumno"
                attendee["last_initial"] = ""
        except Exception:
            attendee["first_name"] = "Alumno"
            attendee["last_initial"] = ""

        if r.status == "waitlisted":
            waitlisted.append(attendee)
        else:
            confirmed.append(attendee)

    return JSONResponse(content={
        "class_id": cls.class_id,
        "class_type": cls.class_type,
        "instructor_name": cls.instructor_name,
        "class_date": cls.class_date,
        "start_time": cls.start_time,
        "duration_minutes": cls.duration_minutes,
        "capacity": cls.capacity,
        "location": cls.location,
        "description": cls.description,
        "is_cancelled": cls.is_cancelled,
        "reservations_count": cls.reservations_count,
        "waitlist_count": cls.waitlist_count,
        "available_spots": max(0, cls.capacity - cls.reservations_count),
        "confirmed": confirmed,
        "waitlisted": waitlisted,
    })


@router.get("/classes")
def get_upcoming_classes(
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    days: int = Query(default=7, ge=1, le=30, description="Days ahead to look"),
) -> JSONResponse:
    """List upcoming classes for the next N days with enrollment status.

    For students: includes whether they already have a reservation/waitlist.
    """
    role = get_user_role(current_user)
    today = mexico_today()
    end_date = today + timedelta(days=days)

    # Resolve student_id for reservation lookup
    student_id: str | None = None
    if role == "student":
        try:
            student = _resolve_student(current_user, student_repo)
            student_id = student.student_id
        except ResourceNotFoundException:
            pass

    try:
        classes, _ = class_repo.list_by_date_range(
            start_date=today.isoformat(),
            end_date=end_date.isoformat(),
            limit=100,
        )

        # Filter out cancelled and past classes
        active_classes = [
            c for c in classes
            if not c.is_cancelled and c.class_date >= today.isoformat()
        ]

        # Build response with enrollment status
        items: list[dict[str, Any]] = []
        for c in active_classes:
            available_spots = max(0, c.capacity - c.reservations_count)
            item_data: dict[str, Any] = {
                "class_id": c.class_id,
                "class_type": c.class_type,
                "class_date": c.class_date,
                "start_time": c.start_time,
                "duration_minutes": c.duration_minutes,
                "instructor_name": c.instructor_name,
                "location": c.location,
                "capacity": c.capacity,
                "reservations_count": c.reservations_count,
                "waitlist_count": c.waitlist_count,
                "available_spots": available_spots,
                "is_full": available_spots == 0,
                "description": c.description,
            }

            # Check if student already has a reservation
            if student_id:
                existing = reservation_repo.get_reservation(c.class_id, student_id)
                if existing and existing.status in ("confirmed", "waitlisted"):
                    item_data["my_status"] = existing.status
                    item_data["my_reservation_id"] = existing.reservation_id
                else:
                    item_data["my_status"] = None
                    item_data["my_reservation_id"] = None
            else:
                item_data["my_status"] = None
                item_data["my_reservation_id"] = None

            items.append(item_data)

        return JSONResponse(content={"items": items})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching classes: {str(e)}",
        )


@router.post("/reservations")
def create_reservation(
    class_id: str = Query(..., description="Class ID to enroll in"),
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
) -> JSONResponse:
    """Student self-service: enroll in a class (or join waitlist if full)."""
    role = get_user_role(current_user)

    if role == "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff cannot create self-service reservations",
        )

    try:
        student = _resolve_student(current_user, student_repo)
        student_id = student.student_id
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    try:
        class_item = class_repo.get_by_id(class_id)
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if class_item.is_cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta clase ha sido cancelada",
        )

    # Booking window: at least 5 minutes before class start
    try:
        class_datetime_str = f"{class_item.class_date}T{class_item.start_time}"
        mx_tz = ZoneInfo("America/Mexico_City")
        class_start = datetime.fromisoformat(class_datetime_str).replace(tzinfo=mx_tz)
        now = datetime.now(tz=mx_tz)
        minutes_until = (class_start - now).total_seconds() / 60
        if minutes_until < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede reservar con menos de 5 minutos de anticipación",
            )
    except (ValueError, TypeError):
        pass

    # Daily limit: 1-session/day memberships
    _ONE_SESSION_TYPES = {"founder", "room_daily", "room_pass", "founder_monthly"}
    membership_repo = MembershipRepository()
    active_mem = membership_repo.get_active_for_student(student_id)
    if active_mem and active_mem.membership_type in _ONE_SESSION_TYPES:
        stu_reservations, _ = reservation_repo.list_for_student(student_id, limit=200)
        # Include "attended" so a Founder who already checked in to today's class
        # cannot reserve a second one the same day.
        same_day = [
            r for r in stu_reservations
            if r.class_date == class_item.class_date
            and r.status in ("confirmed", "attended", "waitlisted")
        ]
        if same_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tu membresía solo permite 1 clase por día. Ya tienes una reservación para esta fecha.",
            )

    # Check for existing reservation
    existing = reservation_repo.get_reservation(class_id, student_id)
    if existing and existing.status in ("confirmed", "waitlisted"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una reservación para esta clase",
        )

    class_date = class_item.class_date
    available_spots = class_item.capacity - class_item.reservations_count
    data = ReservationCreate(student_id=student_id, class_id=class_id)

    student_name = f"{student.first_name} {student.last_name}".strip()
    notifier = EventNotifier()

    if available_spots > 0:
        reservation = reservation_repo.create_reservation(data, class_date)
        class_repo.increment_reservations_count(class_id)

        # Notify student
        notifier.notify_reservation_confirmed(
            student_name=student_name,
            student_email=student.email or "",
            student_phone=student.phone,
            class_type=class_item.class_type,
            class_date=class_item.class_date,
            start_time=class_item.start_time,
            instructor_name=class_item.instructor_name,
            location=class_item.location or "",
        )
        # Notify instructor
        updated = class_repo.get_by_id(class_id)
        inst = notifier.resolve_instructor_for_class(class_item.instructor_name)
        if inst:
            notifier.notify_instructor_student_enrolled(
                instructor_name=inst["name"],
                instructor_email=inst["email"],
                instructor_phone=inst.get("phone"),
                student_name=student_name,
                class_type=class_item.class_type,
                class_date=class_item.class_date,
                start_time=class_item.start_time,
                reservations_count=updated.reservations_count,
                capacity=updated.capacity,
            )
            # Notify instructor if class just became full
            if updated.reservations_count >= updated.capacity:
                notifier.notify_instructor_class_full(
                    instructor_name=inst["name"],
                    instructor_email=inst["email"],
                    instructor_phone=inst.get("phone"),
                    class_type=class_item.class_type,
                    class_date=class_item.class_date,
                    start_time=class_item.start_time,
                    capacity=updated.capacity,
                    waitlist_count=updated.waitlist_count,
                )

        return JSONResponse(
            status_code=201,
            content={
                "message": "Reservación confirmada",
                "status": "confirmed",
                "reservation_id": reservation.reservation_id,
            },
        )
    else:
        position = reservation_repo.get_next_waitlist_position(class_id)
        waitlist_item = reservation_repo.add_to_waitlist(data, class_date, position)
        class_repo.increment_waitlist_count(class_id)

        # Notify student about waitlist
        notifier.notify_waitlist_joined(
            student_name=student_name,
            student_email=student.email or "",
            student_phone=student.phone,
            class_type=class_item.class_type,
            class_date=class_item.class_date,
            start_time=class_item.start_time,
            position=position,
        )

        return JSONResponse(
            status_code=201,
            content={
                "message": f"Te agregamos a la lista de espera (posición #{position})",
                "status": "waitlisted",
                "reservation_id": waitlist_item.reservation_id,
                "waitlist_position": position,
            },
        )


@router.get("/checkins")
def get_checkins(
    current_user: dict[str, Any] = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    limit: int = Query(default=30, ge=1, le=100),
) -> JSONResponse:
    """Return the calling student's recent check-in history (staff returns empty list)."""
    role = get_user_role(current_user)

    if role == "staff":
        return JSONResponse(content=[])

    try:
        student = _resolve_student(current_user, student_repo)
        student_id = student.student_id
    except ResourceNotFoundException:
        return JSONResponse(content=[])

    try:
        checkins = student_repo.list_checkins_for_student(student_id, limit=limit)
        return JSONResponse(content=[
            {
                "checkin_id": c.checkin_id,
                "student_id": c.student_id,
                "checked_in_at": c.checked_in_at,
                "can_enter": c.can_enter,
                "reason": c.reason,
            }
            for c in checkins
        ])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching check-ins: {str(e)}",
        )
