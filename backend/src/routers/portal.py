"""Portal router — self-service endpoints for students and instructors."""

from datetime import date, datetime, timedelta, timezone
from io import BytesIO
import base64

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ..utils.auth import require_student_or_staff_group
from ..utils.exceptions import ResourceNotFoundException
from ..repositories.student_repository import StudentRepository
from ..repositories.membership_repository import MembershipRepository
from ..repositories.reservation_repository import ReservationRepository
from ..repositories.instructor_repository import InstructorRepository
from ..repositories.class_repository import ClassRepository
from ..models.reservation import ReservationCreate

router = APIRouter(prefix="/portal", tags=["portal"])

# Minimum hours before class start to allow self-service cancellation
CANCELLATION_CUTOFF_HOURS = 2


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

def get_user_role(current_user: dict) -> str:
    """Return 'staff' if user belongs to the staff Cognito group, else 'student'."""
    groups = current_user.get("cognito:groups", [])
    if "staff" in groups:
        return "staff"
    return "student"


def _find_student_by_email(
    email: str,
    student_repo: StudentRepository,
) -> dict | None:
    """Find a student record by email (scan GSI1, filter by email)."""
    items, _ = student_repo.list_all(limit=1000)
    for item in items:
        if item.email == email:
            return item
    return None


def _resolve_student(
    current_user: dict,
    student_repo: StudentRepository,
):
    """Resolve the student DynamoDB record for the current Cognito user.

    Tries lookup by Cognito sub first (student_id == sub),
    then falls back to email-based lookup.
    """
    user_id = current_user.get("sub")
    email = current_user.get("email", "")

    # Try direct lookup (student_id == cognito sub)
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
    class_item,
) -> tuple[bool, str]:
    """Check if a reservation can be cancelled (2-hour cutoff before class start)."""
    try:
        class_datetime_str = f"{class_item.class_date}T{class_item.start_time}"
        # Mexico City timezone approximation (UTC-6)
        class_start = datetime.fromisoformat(class_datetime_str).replace(
            tzinfo=timezone(timedelta(hours=-6))
        )
        now = datetime.now(tz=timezone(timedelta(hours=-6)))
        hours_until_class = (class_start - now).total_seconds() / 3600

        if hours_until_class < CANCELLATION_CUTOFF_HOURS:
            return False, f"No puedes cancelar con menos de {CANCELLATION_CUTOFF_HOURS} horas de anticipación"
        return True, ""
    except (ValueError, TypeError):
        return True, ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/profile")
def get_profile(
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
):
    """Return the current user's profile (student or instructor)."""
    user_id = current_user.get("sub")
    role = get_user_role(current_user)

    try:
        if role == "student":
            profile = _resolve_student(current_user, student_repo)
            return JSONResponse(content={
                "role": "student",
                "student_id": profile.student_id,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "email": profile.email,
                "phone": profile.phone,
                "status": profile.status,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
            })
        else:
            profile = instructor_repo.get_by_id(user_id)
            return JSONResponse(content={
                "role": "staff",
                "instructor_id": profile.instructor_id,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "email": profile.email,
                "phone": profile.phone,
                "status": profile.status,
                "specialties": profile.specialties,
                "bio": profile.bio,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
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
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
):
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
            days_until_expiry = (date.fromisoformat(membership.end_date) - date.today()).days

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
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
):
    """Generate and return the current user's QR code as base64 PNG.

    IMPORTANT: For students, the QR encodes the *student_id* (DynamoDB key),
    NOT the Cognito sub.  This matches what the kiosk scanner expects.
    """
    user_id = current_user.get("sub")
    role = get_user_role(current_user)

    try:
        if role == "student":
            user = _resolve_student(current_user, student_repo)
            user_name = f"{user.first_name} {user.last_name}"
            qr_data = user.student_id  # encode student_id for kiosk compatibility
        else:
            user = instructor_repo.get_by_id(user_id)
            user_name = f"{user.first_name} {user.last_name}"
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
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    status_filter: str | None = Query(None, description="Filter by status"),
):
    """Return reservations for students or assigned classes for staff."""
    role = get_user_role(current_user)
    user_id = current_user.get("sub")

    try:
        if role == "student":
            student = _resolve_student(current_user, student_repo)
            student_id = student.student_id
            reservations, _ = reservation_repo.list_for_student(student_id, limit=50)

            if status_filter:
                reservations = [r for r in reservations if r.status == status_filter]

            # Enrich each reservation with class details and cancellation policy
            items = []
            for r in reservations:
                item_data: dict = {
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
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
):
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

        reservation_repo.cancel_reservation(class_id, student_id)

        # Promote from waitlist
        try:
            class_item = class_repo.get_by_id(class_id)
            class_repo.decrement_reservations_count(class_id)
            promoted = reservation_repo.promote_from_waitlist(class_id, class_item.class_date)
            if promoted:
                class_repo.increment_reservations_count(class_id)
                class_repo.decrement_waitlist_count(class_id)
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


@router.get("/classes")
def get_upcoming_classes(
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    days: int = Query(default=7, ge=1, le=30, description="Days ahead to look"),
):
    """List upcoming classes for the next N days with enrollment status.

    For students: includes whether they already have a reservation/waitlist.
    """
    role = get_user_role(current_user)
    today = date.today()
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
        items = []
        for c in active_classes:
            available_spots = max(0, c.capacity - c.reservations_count)
            item_data: dict = {
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
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
):
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

    if available_spots > 0:
        reservation = reservation_repo.create_reservation(data, class_date)
        class_repo.increment_reservations_count(class_id)
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
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    limit: int = Query(default=30, ge=1, le=100),
):
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
