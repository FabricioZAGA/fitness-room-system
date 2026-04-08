"""Notifications router — email notification endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Query

from src.models.notification import (
    BulkNotificationResult,
    NotificationResponse,
    SendBulkNotificationRequest,
    SendCustomNotificationRequest,
)
from src.services.notification_service import NotificationService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_service() -> NotificationService:
    return NotificationService()


@router.post(
    "/send-expiry-reminders",
    response_model=BulkNotificationResult,
    summary="Send Membership Expiry Reminders",
    description=(
        "Send email reminders to all students with memberships expiring soon. "
        "Students within `critical_days` get an urgent email; "
        "those within `warning_days` get a standard reminder. "
        "Use `dry_run=true` to preview recipients without sending."
    ),
)
def send_expiry_reminders(
    body: SendBulkNotificationRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
) -> BulkNotificationResult:
    return service.send_expiry_reminders(
        critical_days=body.critical_days,
        warning_days=body.warning_days,
        dry_run=body.dry_run,
    )


@router.post(
    "/send-inactivity-alerts",
    response_model=BulkNotificationResult,
    summary="Send Inactivity Alerts",
    description=(
        "Send email alerts to active students who haven't checked in in `inactive_days` days. "
        "Use `dry_run=true` to preview recipients without sending."
    ),
)
def send_inactivity_alerts(
    body: SendBulkNotificationRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
) -> BulkNotificationResult:
    return service.send_inactivity_alerts(
        inactive_days=body.inactive_days,
        dry_run=body.dry_run,
    )


@router.post(
    "/student/{student_id}",
    response_model=NotificationResponse,
    summary="Send Custom Notification",
    description="Send a one-off custom email to a specific student.",
)
def send_custom_notification(
    student_id: str,
    body: SendCustomNotificationRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
) -> NotificationResponse:
    return service.send_custom(
        student_id=student_id,
        subject=body.subject,
        message=body.message,
    )


@router.get(
    "",
    response_model=list[NotificationResponse],
    summary="List Recent Notifications",
    description="Return the most recent notification log entries, newest first.",
)
def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: NotificationService = Depends(get_service),
) -> list[NotificationResponse]:
    return service.list_recent(limit=limit)
