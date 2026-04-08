"""Notification models — email/SMS notification logs for gym management."""

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class NotificationChannel(StrEnum):
    EMAIL = "email"
    SMS = "sms"


class NotificationType(StrEnum):
    EXPIRY_REMINDER = "expiry_reminder"
    INACTIVITY_ALERT = "inactivity_alert"
    CUSTOM = "custom"


class NotificationStatus(StrEnum):
    SENT = "sent"
    FAILED = "failed"


# ─── Request models ───────────────────────────────────────────────────────────

class SendCustomNotificationRequest(BaseModel):
    """Request body for sending a custom notification to a specific student."""

    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    channel: NotificationChannel = NotificationChannel.EMAIL


class SendBulkNotificationRequest(BaseModel):
    """Request body for bulk notification triggers (expiry/inactivity)."""

    critical_days: int = Field(default=7, ge=1, le=30)
    warning_days: int = Field(default=30, ge=1, le=90)
    inactive_days: int = Field(default=14, ge=1, le=90)
    dry_run: bool = Field(
        default=False,
        description="If true, returns who would be notified without sending",
    )


# ─── Response models ──────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    """API response for a single notification log entry."""

    notification_id: str
    student_id: str | None
    student_name: str | None
    notification_type: NotificationType
    channel: NotificationChannel
    status: NotificationStatus
    subject: str
    recipient_email: str | None
    sent_at: str
    error_message: str | None = None


class BulkNotificationResult(BaseModel):
    """Result of a bulk notification send operation."""

    sent: int = 0
    failed: int = 0
    skipped: int = 0
    notifications: list[NotificationResponse] = Field(default_factory=list)


# ─── DynamoDB model ───────────────────────────────────────────────────────────

class NotificationDynamoItem(BaseModel):
    """DynamoDB representation of a notification log entry.

    Keys:
        PK:      NOTIFICATION#{notification_id}
        SK:      METADATA
        GSI1PK:  NOTIFICATIONS
        GSI1SK:  DATE#{date}T{time}#{notification_id}  (for listing by date desc)
    """

    PK: str
    SK: str = "METADATA"
    GSI1PK: str = "NOTIFICATIONS"
    GSI1SK: str
    entity_type: str = "NOTIFICATION"

    notification_id: str
    student_id: str | None = None
    student_name: str | None = None
    notification_type: str
    channel: str
    status: str
    subject: str
    recipient_email: str | None = None
    sent_at: str
    error_message: str | None = None

    @classmethod
    def create(
        cls,
        notification_type: NotificationType,
        channel: NotificationChannel,
        status: NotificationStatus,
        subject: str,
        student_id: str | None = None,
        student_name: str | None = None,
        recipient_email: str | None = None,
        error_message: str | None = None,
    ) -> "NotificationDynamoItem":
        """Factory — builds a new notification log item."""
        nid = str(uuid4())
        now = datetime.now(timezone.utc)
        sent_at = now.isoformat()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")

        return cls(
            PK=f"NOTIFICATION#{nid}",
            GSI1SK=f"DATE#{date_str}T{time_str}#{nid}",
            notification_id=nid,
            student_id=student_id,
            student_name=student_name,
            notification_type=notification_type,
            channel=channel,
            status=status,
            subject=subject,
            recipient_email=recipient_email,
            sent_at=sent_at,
            error_message=error_message,
        )

    def to_response(self) -> NotificationResponse:
        """Convert DynamoDB item to API response model."""
        return NotificationResponse(
            notification_id=self.notification_id,
            student_id=self.student_id,
            student_name=self.student_name,
            notification_type=NotificationType(self.notification_type),
            channel=NotificationChannel(self.channel),
            status=NotificationStatus(self.status),
            subject=self.subject,
            recipient_email=self.recipient_email,
            sent_at=self.sent_at,
            error_message=self.error_message,
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for DynamoDB storage, excluding None values."""
        return {k: v for k, v in self.model_dump().items() if v is not None}
