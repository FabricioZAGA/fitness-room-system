"""Portal router — self-service endpoints for students and instructors."""

from datetime import date
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

router = APIRouter(prefix="/portal", tags=["portal"])


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
            profile = student_repo.get_by_id(user_id)
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
    membership_repo: MembershipRepository = Depends(get_membership_repository),
):
    """Return the current student's active membership (staff always returns null)."""
    role = get_user_role(current_user)

    if role == "staff":
        return JSONResponse(content={"role": "staff", "membership": None})

    student_id = current_user.get("sub")

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
    """Generate and return the current user's QR code as base64 PNG."""
    user_id = current_user.get("sub")
    role = get_user_role(current_user)

    try:
        if role == "student":
            user = student_repo.get_by_id(user_id)
            user_name = f"{user.first_name} {user.last_name}"
        else:
            user = instructor_repo.get_by_id(user_id)
            user_name = f"{user.first_name} {user.last_name}"
    except ResourceNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(user_id)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_b64 = base64.b64encode(buffer.getvalue()).decode()

        return JSONResponse(content={
            "role": role,
            "user_id": user_id,
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
            reservations, _ = reservation_repo.list_for_student(user_id, limit=50)

            if status_filter:
                reservations = [r for r in reservations if r.status == status_filter]

            return JSONResponse(content={
                "role": "student",
                "items": [
                    {
                        "reservation_id": r.reservation_id,
                        "student_id": r.student_id,
                        "class_id": r.class_id,
                        "class_date": r.class_date,
                        "status": r.status,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                    }
                    for r in reservations
                ],
            })
        else:
            # Staff: list classes where this instructor is assigned.
            # GSI2PK uses the instructor name slug — look up the name first.
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
                        "instructor_id": user_id,
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
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
):
    """Cancel the calling student's reservation for a given class."""
    role = get_user_role(current_user)

    if role == "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff cannot cancel reservations",
        )

    student_id = current_user.get("sub")

    try:
        reservation = reservation_repo.get_reservation(class_id, student_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found",
            )

        reservation_repo.cancel_reservation(class_id, student_id)
        return JSONResponse(content={"message": "Reservation cancelled successfully"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling reservation: {str(e)}",
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

    student_id = current_user.get("sub")

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
