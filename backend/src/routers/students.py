"""Students router — CRUD endpoints for student management."""

import base64
import io
import threading
import uuid
from typing import Any

import boto3
import qrcode
import qrcode.image.svg
from aws_lambda_powertools import Logger
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from src.config import get_settings
from src.models.checkin import CheckinResponse
from src.models.common import MessageResponse, PaginatedResponse
from src.models.student import StudentCreate, StudentResponse, StudentStatus, StudentUpdate
from src.services.checkin_service import CheckinService
from src.services.cognito_service import CognitoService
from src.services.event_notifier import EventNotifier
from src.services.notification_service import NotificationService
from src.services.student_service import StudentService
from src.utils.auth import get_current_user

logger = Logger()

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
    settings = get_settings()

    # Run post-creation tasks in parallel threads to stay within
    # API Gateway's 30 s hard timeout. Each task is independent.
    # We must join() all threads — Lambda freezes the execution
    # context after the response, killing any pending work.

    cognito_password: list[str] = []

    def _send_welcome(n: str, email: str, phone: str | None, sid: str) -> None:
        try:
            EventNotifier().notify_welcome_carta_responsiva(
                student_name=n, student_email=email, student_phone=phone,
            )
        except Exception:
            logger.exception("Welcome email failed", extra={"student_id": sid})

    def _notify_admins(n: str, email: str, sid: str) -> None:
        try:
            notif_svc = NotificationService()
            admin_emails = notif_svc._get_admin_emails()  # noqa: SLF001
            if admin_emails:
                EventNotifier().notify_admin_new_student(
                    student_name=n, student_email=email, admin_emails=admin_emails,
                )
        except Exception:
            logger.exception("Admin notification failed", extra={"student_id": sid})

    def _create_cognito(n: str, email: str, sid: str) -> None:
        try:
            pwd = CognitoService().create_student_user(email=email, name=n)
            cognito_password.append(pwd)
        except Exception:
            logger.exception("Cognito user creation failed", extra={"student_id": sid})

    threads = [
        threading.Thread(target=_send_welcome, args=(name, result.email, result.phone, result.student_id)),
        threading.Thread(target=_notify_admins, args=(name, result.email, result.student_id)),
        threading.Thread(target=_create_cognito, args=(name, result.email, result.student_id)),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=25)

    # Send portal credentials after Cognito user is created
    if cognito_password:
        try:
            EventNotifier().notify_portal_credentials(
                student_name=name,
                student_email=result.email,
                password=cognito_password[0],
                portal_url=settings.portal_url,
            )
        except Exception:
            logger.exception(
                "Portal credentials email failed",
                extra={"student_id": result.student_id},
            )

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
    description=(
        "Set the student's status to 'inactive'. "
        "Cascade: any active/frozen membership is automatically cancelled."
    ),
)
def deactivate_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Deactivate a student (cancels active membership)."""
    return service.deactivate_student(student_id)


@router.post(
    "/{student_id}/suspend",
    response_model=StudentResponse,
    summary="Suspend Student",
    description=(
        "Temporarily suspend a student (conduct, debt). "
        "Cascade: any active membership is automatically frozen."
    ),
)
def suspend_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Suspend a student (freezes active membership)."""
    return service.suspend_student(student_id)


@router.post(
    "/{student_id}/unsuspend",
    response_model=StudentResponse,
    summary="Unsuspend Student",
    description=(
        "Reactivate a suspended student. "
        "Cascade: any frozen membership is automatically unfrozen."
    ),
)
def unsuspend_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Unsuspend a student (unfreezes membership)."""
    return service.unsuspend_student(student_id)


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


# ── Resend / Contact Update endpoints ─────────────────────────────────────────


class ResendResponse(BaseModel):
    """Response for resend operations."""

    message: str
    delivery_status: str | None = None
    delivery_detail: str | None = None


class UpdateContactRequest(BaseModel):
    """Request to update a student's contact info (email/phone) and sync Cognito."""

    email: EmailStr | None = None
    phone: str | None = None
    skip_password_change: bool = Field(
        default=False,
        description="If true, set a permanent password (no forced change on first login).",
    )
    resend_all: bool = Field(
        default=True,
        description="Resend credentials + carta responsiva to the (new) email.",
    )


@router.post(
    "/{student_id}/resend-welcome",
    response_model=ResendResponse,
    summary="Resend Welcome Email + Carta Responsiva",
    description="Re-generate the carta responsiva PDF and resend the welcome email to the student.",
)
def resend_welcome(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> ResendResponse:
    """Resend welcome email with carta responsiva PDF."""
    student = service.get_student(student_id)
    name = f"{student.first_name} {student.last_name}".strip()
    try:
        EventNotifier().notify_welcome_carta_responsiva(
            student_name=name,
            student_email=student.email,
            student_phone=student.phone,
        )
        return ResendResponse(
            message=f"Welcome email resent to {student.email}",
            delivery_status="sent",
        )
    except Exception as exc:
        logger.exception("Resend welcome failed", extra={"student_id": student_id})
        return ResendResponse(
            message="Failed to resend welcome email",
            delivery_status="failed",
            delivery_detail=str(exc),
        )


@router.post(
    "/{student_id}/resend-credentials",
    response_model=ResendResponse,
    summary="Resend Portal Credentials",
    description=(
        "Reset the student's Cognito password and resend the portal credentials email. "
        "Use skip_password_change=true for elderly users who struggle with forced change."
    ),
)
def resend_credentials(
    student_id: str,
    skip_password_change: bool = Query(
        default=False,
        description="Set permanent password (no forced change on first login)",
    ),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> ResendResponse:
    """Reset Cognito password and resend portal credentials."""
    student = service.get_student(student_id)
    name = f"{student.first_name} {student.last_name}".strip()
    settings = get_settings()

    svc = CognitoService()
    try:
        if skip_password_change:
            password = svc.set_permanent_password(student.email)
        else:
            password = svc.generate_password()
            svc._cognito.admin_set_user_password(  # noqa: SLF001
                UserPoolId=svc._pool_id,
                Username=student.email,
                Password=password,
                Permanent=False,
            )
    except Exception as exc:
        logger.exception("Cognito password reset failed", extra={"student_id": student_id})
        return ResendResponse(
            message="Failed to reset Cognito password — user may not exist in Cognito",
            delivery_status="failed",
            delivery_detail=str(exc),
        )

    delivery = EventNotifier().notify_portal_credentials(
        student_name=name,
        student_email=student.email,
        password=password,
        portal_url=settings.portal_url,
    )
    return ResendResponse(
        message=f"Credentials resent to {student.email}"
        + (" (permanent password)" if skip_password_change else " (temp password)"),
        delivery_status=delivery.get("status"),
        delivery_detail=delivery.get("detail") or None,
    )


@router.post(
    "/{student_id}/update-contact",
    response_model=StudentResponse,
    summary="Update Contact Info + Sync Cognito",
    description=(
        "Update a student's email and/or phone in DynamoDB and sync the change to Cognito. "
        "Optionally resend portal credentials to the new email."
    ),
)
def update_contact(
    student_id: str,
    data: UpdateContactRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Update contact info and sync with Cognito."""
    student = service.get_student(student_id)
    old_email = student.email
    settings = get_settings()

    # Build update payload
    update_data = StudentUpdate()
    if data.email and data.email != old_email:
        update_data.email = data.email
    if data.phone is not None:
        update_data.phone = data.phone

    # Update DynamoDB first
    updated = service.update_student(student_id, update_data)

    email_changed = data.email is not None and data.email != old_email
    target_email = data.email if email_changed else old_email
    full_name = f"{updated.first_name} {updated.last_name}".strip()
    svc = CognitoService()
    notifier = EventNotifier()

    # Sync email change to Cognito
    if email_changed:
        try:
            svc.update_user_email(old_email, data.email)  # type: ignore[arg-type]
            logger.info(
                "Cognito email synced",
                extra={"student_id": student_id, "new_email": data.email},
            )
        except Exception:
            logger.exception(
                "Cognito sync failed after email update",
                extra={"student_id": student_id, "new_email": data.email},
            )

    # Resend credentials + carta responsiva
    if data.resend_all:
        try:
            # After email update, Cognito still accepts old_email as username lookup
            cognito_username = old_email
            if data.skip_password_change:
                password = svc.set_permanent_password(cognito_username)
            else:
                password = svc.generate_password()
                svc._cognito.admin_set_user_password(  # noqa: SLF001
                    UserPoolId=svc._pool_id,
                    Username=cognito_username,
                    Password=password,
                    Permanent=False,
                )

            # Send credentials to the target email
            notifier.notify_portal_credentials(
                student_name=full_name,
                student_email=target_email,
                password=password,
                portal_url=settings.portal_url,
            )

            # Also send carta responsiva PDF
            notifier.notify_welcome_carta_responsiva(
                student_name=full_name,
                student_email=target_email,
                student_phone=updated.phone,
            )
        except Exception:
            logger.exception(
                "Resend notifications failed after contact update",
                extra={"student_id": student_id, "target_email": target_email},
            )

    return updated


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


@router.post(
    "/{student_id}/photo/upload-url",
    summary="Get presigned URL for photo upload",
    description="Generate a presigned S3 PUT URL for student photo upload.",
)
def get_photo_upload_url(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> JSONResponse:
    """Return a presigned URL + the final photo URL for the student."""
    service.get_student(student_id)  # validate student exists
    settings = get_settings()
    s3_client = boto3.client("s3", region_name=settings.aws_region)

    file_key = f"students/{student_id}/photo-{uuid.uuid4().hex[:8]}.jpg"

    presigned_url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_media_bucket,
            "Key": file_key,
            "ContentType": "image/jpeg",
        },
        ExpiresIn=300,
    )

    photo_url = f"https://{settings.s3_media_bucket}.s3.{settings.aws_region}.amazonaws.com/{file_key}"

    return JSONResponse(
        content={
            "upload_url": presigned_url,
            "photo_url": photo_url,
            "key": file_key,
        }
    )


@router.post(
    "/{student_id}/photo",
    response_model=StudentResponse,
    summary="Upload student photo (base64)",
    description=(
        "Upload a student photo as base64-encoded JPEG. "
        "The image is stored in S3 and the photo_url is saved on the student profile."
    ),
)
def upload_student_photo(
    student_id: str,
    payload: dict[str, str],
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Accept base64 image, upload to S3, update student.photo_url."""
    service.get_student(student_id)  # validate exists
    image_b64 = payload.get("image", "")
    if not image_b64:
        return JSONResponse(status_code=400, content={"detail": "Missing 'image' field"})  # type: ignore[return-value]

    # Strip data URI prefix if present
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    image_data = base64.b64decode(image_b64)

    settings = get_settings()
    s3_client = boto3.client("s3", region_name=settings.aws_region)
    file_key = f"students/{student_id}/photo-{uuid.uuid4().hex[:8]}.jpg"

    s3_client.put_object(
        Bucket=settings.s3_media_bucket,
        Key=file_key,
        Body=image_data,
        ContentType="image/jpeg",
    )

    photo_url = f"https://{settings.s3_media_bucket}.s3.{settings.aws_region}.amazonaws.com/{file_key}"

    return service.update_student(student_id, StudentUpdate(photo_url=photo_url))
