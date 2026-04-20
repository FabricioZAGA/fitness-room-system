"""Students router — CRUD endpoints for student management."""

import base64
import io
from typing import Any

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from src.models.checkin import CheckinResponse
from src.models.common import MessageResponse, PaginatedResponse
from src.models.student import StudentCreate, StudentResponse, StudentStatus, StudentUpdate
from src.services.checkin_service import CheckinService
from src.services.student_service import StudentService
from src.services.event_notifier import EventNotifier
from src.services.notification_service import NotificationService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/students", tags=["Students"])


def get_service() -> StudentService:
    """Dependency: return a StudentService instance."""
    return StudentService()


def get_checkin_service() -> CheckinService:
    """Dependency: return a CheckinService instance."""
    return CheckinService()


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Student",
    description="Register a new student in the system. Email must be unique.",
)
def create_student(
    data: StudentCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Create a new student."""
    result = service.create_student(data)
    name = f"{result.first_name} {result.last_name}".strip()
    notifier = EventNotifier()
    # Send welcome email with carta responsiva PDF
    try:
        notifier.notify_welcome_carta_responsiva(
            student_name=name,
            student_email=result.email,
            student_phone=result.phone,
        )
    except Exception:
        pass
    # Notify admins about the new student
    try:
        notif_svc = NotificationService()
        admin_emails = notif_svc._get_admin_emails()  # noqa: SLF001
        if admin_emails:
            notifier.notify_admin_new_student(
                student_name=name,
                student_email=result.email,
                admin_emails=admin_emails,
            )
    except Exception:
        pass
    return result


@router.get(
    "",
    response_model=PaginatedResponse[StudentResponse],
    summary="List Students",
    description="List all students with optional filtering by status and pagination.",
)
def list_students(
    status_filter: StudentStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    last_key: str | None = Query(
        default=None, description="Pagination token from previous response"
    ),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> PaginatedResponse[StudentResponse]:
    """List all students."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_students(
        status=status_filter,
        limit=limit,
        last_evaluated_key=last_evaluated_key,
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
    "/{student_id}",
    response_model=StudentResponse,
    summary="Get Student",
    description="Get a student's full profile by ID.",
)
def get_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Get a student by ID."""
    return service.get_student(student_id)


@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Update Student",
    description="Partially update a student's profile. Only provided fields will be updated.",
)
def update_student(
    student_id: str,
    data: StudentUpdate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Update a student's profile."""
    return service.update_student(student_id, data)


@router.post(
    "/{student_id}/activate",
    response_model=StudentResponse,
    summary="Activate Student",
    description="Set the student's status to 'active'.",
)
def activate_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Activate a student."""
    return service.activate_student(student_id)


@router.post(
    "/{student_id}/deactivate",
    response_model=StudentResponse,
    summary="Deactivate Student",
    description="Set the student's status to 'inactive'.",
)
def deactivate_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Deactivate a student."""
    return service.deactivate_student(student_id)


@router.delete(
    "/{student_id}",
    response_model=MessageResponse,
    summary="Delete Student",
    description="Permanently delete a student. This action cannot be undone.",
)
def delete_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> MessageResponse:
    """Delete a student by ID."""
    service.delete_student(student_id)
    return MessageResponse(message=f"Student '{student_id}' deleted successfully.")


@router.post(
    "/{student_id}/checkin",
    response_model=CheckinResponse,
    status_code=status.HTTP_200_OK,
    summary="Register Check-in",
    description=(
        "Record a gym entry check-in for a student. "
        "Validates student status and active membership. "
        "Always records the attempt (allowed or denied). "
        "Returns can_enter=True if the student is allowed to enter."
    ),
    tags=["Students"],
)
def checkin_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: CheckinService = Depends(get_checkin_service),
) -> CheckinResponse:
    """Register a gym entry check-in."""
    return service.checkin(student_id)


@router.get(
    "/{student_id}/qr",
    summary="Get Student QR Code",
    description=(
        "Generate a QR code PNG image for a student's check-in. "
        "Returns the image as a base64-encoded string with metadata. "
        "The QR code encodes the student_id, readable by the kiosk scanner."
    ),
)
def get_student_qr(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> JSONResponse:
    """Return a base64-encoded QR code PNG for the student."""
    student = service.get_student(student_id)
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(student_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return JSONResponse(
        content={
            "student_id": student_id,
            "student_name": student.full_name,
            "qr_base64": b64,
            "mime_type": "image/png",
        }
    )
