from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from typing import Optional
import qrcode
from io import BytesIO
import base64

from ..utils.auth import require_student_or_staff_group
from ..repositories.student_repository import StudentRepository
from ..repositories.membership_repository import MembershipRepository
from ..repositories.reservation_repository import ReservationRepository
from ..repositories.instructor_repository import InstructorRepository
from ..repositories.class_repository import ClassRepository

router = APIRouter(prefix="/portal", tags=["portal"])

# Dependency injection
def get_student_repository():
    return StudentRepository()

def get_membership_repository():
    return MembershipRepository()

def get_reservation_repository():
    return ReservationRepository()

def get_instructor_repository():
    return InstructorRepository()

def get_class_repository():
    return ClassRepository()


def get_user_role(current_user: dict) -> str:
    """Determine if user is student or staff."""
    groups = current_user.get("cognito:groups", [])
    if "staff" in groups:
        return "staff"
    return "student"


@router.get("/profile")
async def get_profile(
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
):
    """Get current user's profile information (student or staff)"""
    try:
        user_id = current_user.get("sub")
        role = get_user_role(current_user)

        if role == "student":
            profile = await student_repo.get_by_id(user_id)
            if not profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
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
        else:  # staff
            profile = await instructor_repo.get_by_id(user_id)
            if not profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}"
        )


@router.get("/membership")
async def get_membership(
    current_user: dict = Depends(require_student_or_staff_group()),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
):
    """Get current student's active membership (staff returns null)"""
    try:
        role = get_user_role(current_user)
        
        # Staff don't have memberships
        if role == "staff":
            return JSONResponse(content={"role": "staff", "membership": None})
        
        student_id = current_user.get("sub")
        membership = await membership_repo.get_active_by_student(student_id)

        if not membership:
            return JSONResponse(content={"role": "student", "membership": None})

        # Calculate days until expiry
        from datetime import datetime
        days_until_expiry = None
        if membership.end_date:
            days_until_expiry = (membership.end_date - datetime.now()).days

        return JSONResponse(content={
            "role": "student",
            "membership": {
                "membership_id": membership.membership_id,
                "student_id": membership.student_id,
                "membership_type": membership.membership_type,
                "status": membership.status,
                "start_date": membership.start_date.isoformat() if membership.start_date else None,
                "end_date": membership.end_date.isoformat() if membership.end_date else None,
                "price_paid": membership.price_paid,
                "days_until_expiry": days_until_expiry,
                "classes_remaining": membership.classes_remaining,
            },
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching membership: {str(e)}"
        )


@router.get("/qr")
async def get_qr(
    current_user: dict = Depends(require_student_or_staff_group()),
    student_repo: StudentRepository = Depends(get_student_repository),
    instructor_repo: InstructorRepository = Depends(get_instructor_repository),
):
    """Get current user's QR code (student or staff)"""
    try:
        user_id = current_user.get("sub")
        role = get_user_role(current_user)

        if role == "student":
            user = await student_repo.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            user_name = f"{user.first_name} {user.last_name}"
        else:  # staff
            user = await instructor_repo.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Instructor not found"
                )
            user_name = f"{user.first_name} {user.last_name}"

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(user_id)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return JSONResponse(content={
            "role": role,
            "user_id": user_id,
            "user_name": user_name,
            "qr_base64": img_str,
            "mime_type": "image/png",
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating QR code: {str(e)}"
        )


@router.get("/reservations")
async def get_reservations(
    current_user: dict = Depends(require_student_or_staff_group()),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    class_repo: ClassRepository = Depends(get_class_repository),
    status_filter: Optional[str] = Query(None, description="Filter by status (confirmed, cancelled, pending)"),
):
    """Get current user's reservations (student) or assigned classes (staff)"""
    try:
        role = get_user_role(current_user)
        user_id = current_user.get("sub")

        if role == "student":
            if status_filter:
                reservations = await reservation_repo.get_by_student_and_status(user_id, status_filter)
            else:
                reservations = await reservation_repo.get_by_student(user_id)

            return JSONResponse(content={
                "role": "student",
                "items": [
                    {
                        "reservation_id": r.reservation_id,
                        "student_id": r.student_id,
                        "class_id": r.class_id,
                        "class_date": r.class_date.isoformat() if r.class_date else None,
                        "status": r.status,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                    }
                    for r in reservations
                ]
            })
        else:  # staff - get classes they're teaching
            # Get classes where this instructor is assigned
            classes = await class_repo.list_by_instructor(user_id)
            return JSONResponse(content={
                "role": "staff",
                "items": [
                    {
                        "class_id": c.class_id,
                        "class_name": c.class_name,
                        "class_date": c.class_date.isoformat() if c.class_date else None,
                        "instructor_id": c.instructor_id,
                        "status": c.status,
                    }
                    for c in classes
                ]
            })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reservations: {str(e)}"
        )


@router.delete("/reservations/{reservation_id}")
async def cancel_reservation(
    reservation_id: str,
    current_user: dict = Depends(require_student_or_staff_group()),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
):
    """Cancel a reservation (students only)"""
    try:
        role = get_user_role(current_user)
        
        # Staff cannot cancel reservations
        if role == "staff":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff cannot cancel reservations"
            )
        
        user_id = current_user.get("sub")
        
        # Get reservation
        reservation = await reservation_repo.get_by_id(reservation_id)
        
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found"
            )
        
        # Verify ownership
        if reservation.student_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own reservations"
            )
        
        # Cancel reservation
        await reservation_repo.update(reservation_id, {"status": "cancelled"})
        
        return JSONResponse(content={"message": "Reservation cancelled successfully"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling reservation: {str(e)}"
        )
