from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from typing import Optional
import qrcode
from io import BytesIO
import base64

from ..utils.auth import get_current_student
from ..repositories.student_repository import StudentRepository
from ..repositories.membership_repository import MembershipRepository
from ..repositories.reservation_repository import ReservationRepository

router = APIRouter(prefix="/portal", tags=["portal"])

# Dependency injection
def get_student_repository():
    return StudentRepository()

def get_membership_repository():
    return MembershipRepository()

def get_reservation_repository():
    return ReservationRepository()


@router.get("/profile")
async def get_student_profile(
    current_student: dict = Depends(get_current_student),
    student_repo: StudentRepository = Depends(get_student_repository)
):
    """Get current student's profile information"""
    try:
        student_id = current_student.get("sub")
        profile = await student_repo.get_by_id(student_id)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        return JSONResponse(content={
            "student_id": profile.student_id,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "email": profile.email,
            "phone": profile.phone,
            "status": profile.status,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}"
        )


@router.get("/membership")
async def get_student_membership(
    current_student: dict = Depends(get_current_student),
    membership_repo: MembershipRepository = Depends(get_membership_repository)
):
    """Get current student's active membership"""
    try:
        student_id = current_student.get("sub")
        membership = await membership_repo.get_active_by_student(student_id)
        
        if not membership:
            return JSONResponse(content=None)
        
        # Calculate days until expiry
        from datetime import datetime
        days_until_expiry = None
        if membership.end_date:
            days_until_expiry = (membership.end_date - datetime.now()).days
        
        return JSONResponse(content={
            "membership_id": membership.membership_id,
            "student_id": membership.student_id,
            "membership_type": membership.membership_type,
            "status": membership.status,
            "start_date": membership.start_date.isoformat() if membership.start_date else None,
            "end_date": membership.end_date.isoformat() if membership.end_date else None,
            "price_paid": membership.price_paid,
            "days_until_expiry": days_until_expiry,
            "classes_remaining": membership.classes_remaining,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching membership: {str(e)}"
        )


@router.get("/qr")
async def get_student_qr(
    current_student: dict = Depends(get_current_student),
    student_repo: StudentRepository = Depends(get_student_repository)
):
    """Get current student's QR code"""
    try:
        student_id = current_student.get("sub")
        student = await student_repo.get_by_id(student_id)
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(student_id)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return JSONResponse(content={
            "student_id": student_id,
            "student_name": f"{student.first_name} {student.last_name}",
            "qr_base64": img_str,
            "mime_type": "image/png",
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating QR code: {str(e)}"
        )


@router.get("/reservations")
async def get_student_reservations(
    current_student: dict = Depends(get_current_student),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository),
    status_filter: Optional[str] = Query(None, description="Filter by status (confirmed, cancelled, pending)")
):
    """Get current student's reservations"""
    try:
        student_id = current_student.get("sub")
        
        if status_filter:
            reservations = await reservation_repo.get_by_student_and_status(student_id, status_filter)
        else:
            reservations = await reservation_repo.get_by_student(student_id)
        
        return JSONResponse(content=[
            {
                "reservation_id": r.reservation_id,
                "student_id": r.student_id,
                "class_id": r.class_id,
                "class_date": r.class_date.isoformat() if r.class_date else None,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reservations
        ])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reservations: {str(e)}"
        )


@router.delete("/reservations/{reservation_id}")
async def cancel_reservation(
    reservation_id: str,
    current_student: dict = Depends(get_current_student),
    reservation_repo: ReservationRepository = Depends(get_reservation_repository)
):
    """Cancel a reservation"""
    try:
        student_id = current_student.get("sub")
        
        # Get reservation
        reservation = await reservation_repo.get_by_id(reservation_id)
        
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found"
            )
        
        # Verify ownership
        if reservation.student_id != student_id:
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
