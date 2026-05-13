"""Notification service — sends emails via AWS SES and logs to DynamoDB.

Supports:
  - Bulk expiry reminders (all students with memberships expiring soon)
  - Bulk inactivity alerts (all students with no recent check-in)
  - Custom single-student notification
  - Low stock alerts (automatic notification when inventory reaches threshold)

In local development (ENVIRONMENT=local) emails are NOT sent — they are
logged at INFO level so the flow can be tested without SES credentials.
"""

from datetime import date, timedelta

import boto3

from src.models.common import mexico_today
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError

from src.config import get_settings
from src.models.notification import (
    BulkNotificationResult,
    NotificationChannel,
    NotificationDynamoItem,
    NotificationResponse,
    NotificationStatus,
    NotificationType,
)
from src.repositories.membership_repository import MembershipRepository
from src.repositories.notification_repository import NotificationRepository
from src.repositories.student_repository import StudentRepository
from src.services.email_templates import (
    custom_notification_html,
    expiry_reminder_html,
    inactivity_admin_summary_html,
    inactivity_alert_html,
    low_stock_alert_html,
)

logger = Logger()
MEMBERSHIP_TYPE_LABELS: dict[str, str] = {
    # Current catalog
    "founder": "Socio Fundador",
    "room_daily": "Room Daily",
    "room_elite": "Room Elite",
    "room_flex": "Room Flex",
    "room_pass": "Room Pass",
    # Legacy labels for historical memberships
    "monthly": "Mensual",
    "quarterly": "Trimestral",
    "semi_annual": "Semestral",
    "annual": "Anual",
    "founder_monthly": "Fundador (Mensual)",
    "class_pack_5": "Pack 5 Clases",
    "class_pack_10": "Pack 10 Clases",
    "class_pack_20": "Pack 20 Clases",
    "day_pass": "Pase de Día",
}


class NotificationService:
    """Orchestrates notification delivery via AWS SES."""

    def __init__(
        self,
        notification_repo: NotificationRepository | None = None,
        membership_repo: MembershipRepository | None = None,
        student_repo: StudentRepository | None = None,
    ) -> None:
        self._settings = get_settings()
        self._notif_repo = notification_repo or NotificationRepository()
        self._membership_repo = membership_repo or MembershipRepository()
        self._student_repo = student_repo or StudentRepository()

        # SES client — only real calls in non-local environments
        self._ses = boto3.client("ses", region_name=self._settings.aws_region)
        # Cognito client for listing admin users
        self._cognito = boto3.client("cognito-idp", region_name=self._settings.cognito_region)

    # ──────────────────────────────────────────────────────────────────
    # Public — bulk triggers
    # ──────────────────────────────────────────────────────────────────

    def send_expiry_reminders(
        self,
        critical_days: int = 7,
        warning_days: int = 30,
        dry_run: bool = False,
    ) -> BulkNotificationResult:
        """Send membership expiry reminders to students whose membership ends soon.

        Students within `critical_days` get an urgent email; those within
        `warning_days` (but beyond critical_days) get a standard reminder.
        """
        result = BulkNotificationResult()
        memberships, _ = self._membership_repo.list_expiring_soon(days=warning_days, limit=200)

        for membership in memberships:
            student_id = membership.student_id
            try:
                student_item = self._student_repo.get_item(f"STUDENT#{student_id}", "PROFILE")
                if not student_item or not student_item.get("email"):
                    result.skipped += 1
                    continue

                student_name = (
                    f"{student_item.get('first_name', '')} {student_item.get('last_name', '')}".strip()
                )
                email = student_item["email"]
                end_date = date.fromisoformat(membership.end_date)
                days_left = (end_date - mexico_today()).days
                membership_label = MEMBERSHIP_TYPE_LABELS.get(
                    membership.membership_type, membership.membership_type
                )

                subject = (
                    f"⚠️ Tu membresía vence en {days_left} día{'s' if days_left != 1 else ''}"
                    if days_left <= critical_days
                    else f"Recordatorio: tu membresía vence el {membership.end_date}"
                )
                html_body = expiry_reminder_html(
                    student_name=student_name,
                    days_left=days_left,
                    membership_type=membership_label,
                    end_date=membership.end_date,
                    gym_name=self._settings.ses_sender_name,
                    gym_phone=self._settings.gym_phone,
                )

                notif = self._send_and_log(
                    student_id=student_id,
                    student_name=student_name,
                    recipient_email=email,
                    subject=subject,
                    html_body=html_body,
                    notification_type=NotificationType.EXPIRY_REMINDER,
                    dry_run=dry_run,
                )
                result.notifications.append(notif)
                if notif.status == NotificationStatus.SENT:
                    result.sent += 1
                else:
                    result.failed += 1

            except Exception as exc:
                logger.warning(
                    "Failed to send expiry reminder",
                    student_id=student_id,
                    error=str(exc),
                )
                result.failed += 1

        return result

    def send_inactivity_alerts(
        self,
        inactive_days: int = 30,
        dry_run: bool = False,
    ) -> BulkNotificationResult:
        """Send a single inactivity summary email **to admin** with inactive students.

        Instead of emailing each student, we collect the list of active students
        who haven't checked in for ``inactive_days`` and send one digest to
        ``settings.admin_email`` (or ``ses_sender_email`` as fallback).
        """
        result = BulkNotificationResult()
        cutoff = (mexico_today() - timedelta(days=inactive_days)).isoformat()

        students, _ = self._student_repo.list_all(limit=500)
        active_students = [s for s in students if s.status == "active"]

        inactive_list: list[dict[str, str]] = []
        for student in active_students:
            sid = student.student_id
            try:
                checkin_items, _ = self._student_repo.query_by_pk(
                    pk=f"STUDENT#{sid}",
                    sk_begins_with="CHECKIN#",
                    limit=50,
                )
                has_recent = any(
                    c.get("checked_in_at", "")[:10] >= cutoff and c.get("can_enter")
                    for c in checkin_items
                )
                if has_recent:
                    result.skipped += 1
                    continue

                inactive_list.append({
                    "student_id": sid,
                    "student_name": f"{student.first_name} {student.last_name}".strip(),
                    "email": student.email or "—",
                    "phone": student.phone or "—",
                })
            except Exception as exc:
                logger.warning("Failed to check inactivity", student_id=sid, error=str(exc))
                result.skipped += 1

        if not inactive_list:
            logger.info("No inactive students found", inactive_days=inactive_days)
            return result

        admin_email = self._settings.admin_email or self._settings.ses_sender_email
        gym_name = self._settings.ses_sender_name

        subject = f"Reporte de Inactividad — {len(inactive_list)} alumno{'s' if len(inactive_list) != 1 else ''} ({inactive_days}+ días)"
        html_body = inactivity_admin_summary_html(
            inactive_students=inactive_list,
            inactive_days=inactive_days,
            gym_name=gym_name,
        )

        notif = self._send_and_log(
            student_id="ADMIN",
            student_name="Admin",
            recipient_email=admin_email,
            subject=subject,
            html_body=html_body,
            notification_type=NotificationType.INACTIVITY_ALERT,
            dry_run=dry_run,
        )
        result.notifications.append(notif)
        if notif.status == NotificationStatus.SENT:
            result.sent = 1
        else:
            result.failed = 1

        return result

    def send_custom(
        self,
        student_id: str,
        subject: str,
        message: str,
        dry_run: bool = False,
    ) -> NotificationResponse:
        """Send a custom one-off email to a specific student."""
        student_item = self._student_repo.get_item(f"STUDENT#{student_id}", "PROFILE")
        if not student_item:
            raise ValueError(f"Student {student_id} not found")
        if not student_item.get("email"):
            raise ValueError(f"Student {student_id} has no email address")

        student_name = (
            f"{student_item.get('first_name', '')} {student_item.get('last_name', '')}".strip()
        )
        html_body = custom_notification_html(
            student_name=student_name,
            message=message,
            gym_name=self._settings.ses_sender_name,
        )
        return self._send_and_log(
            student_id=student_id,
            student_name=student_name,
            recipient_email=student_item["email"],
            subject=subject,
            html_body=html_body,
            notification_type=NotificationType.CUSTOM,
            dry_run=dry_run,
        )

    def send_low_stock_alert(
        self,
        product_name: str,
        current_stock: int,
        threshold: int,
        dry_run: bool = False,
    ) -> list[NotificationResponse]:
        """Send low stock alert to all users in the 'admin' Cognito group."""
        subject = f"📦 Alerta: {product_name} - Stock bajo"
        html_body = low_stock_alert_html(
            product_name=product_name,
            current_stock=current_stock,
            threshold=threshold,
            gym_name=self._settings.ses_sender_name,
        )

        # Get admin emails from Cognito
        admin_emails = self._get_admin_emails()

        # Fallback to ses_sender_email if no admins found
        if not admin_emails:
            logger.warning("No admin users found in Cognito, using fallback email")
            admin_emails = [self._settings.ses_sender_email]

        # Send to each admin
        results = []
        for email in admin_emails:
            try:
                result = self._send_and_log(
                    student_id=None,
                    student_name=None,
                    recipient_email=email,
                    subject=subject,
                    html_body=html_body,
                    notification_type=NotificationType.LOW_STOCK,
                    dry_run=dry_run,
                )
                results.append(result)
            except Exception as e:
                logger.error("Failed to send low stock alert to admin", email=email, error=str(e))

        return results

    def list_recent(self, limit: int = 50) -> list[NotificationResponse]:
        """Return the most recent notification logs."""
        items, _ = self._notif_repo.list_recent(limit=limit)
        result = []
        for item in items:
            try:
                dynamo_item = NotificationDynamoItem(**item)
                result.append(dynamo_item.to_response())
            except Exception:
                continue
        return result

    # ──────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────

    def _get_admin_emails(self) -> list[str]:
        """Get list of email addresses for all users in the 'admin' Cognito group."""
        admin_emails = []
        try:
            response = self._cognito.list_users_in_group(
                UserPoolId=self._settings.cognito_user_pool_id,
                GroupName="admin",
                Limit=60,
            )
            for user in response.get("Users", []):
                for attr in user.get("Attributes", []):
                    if attr.get("Name") == "email":
                        email = attr.get("Value")
                        if email:
                            admin_emails.append(email)
                            break

            # Handle pagination if more than 60 users
            while "NextToken" in response:
                response = self._cognito.list_users_in_group(
                    UserPoolId=self._settings.cognito_user_pool_id,
                    GroupName="admin",
                    Limit=60,
                    NextToken=response["NextToken"],
                )
                for user in response.get("Users", []):
                    for attr in user.get("Attributes", []):
                        if attr.get("Name") == "email":
                            email = attr.get("Value")
                            if email:
                                admin_emails.append(email)
                                break

            logger.info("Found admin users for notifications", count=len(admin_emails))
        except Exception as e:
            logger.warning("Failed to list admin users from Cognito", error=str(e))

        return admin_emails

    def _send_and_log(
        self,
        student_id: str | None,
        student_name: str | None,
        recipient_email: str,
        subject: str,
        html_body: str,
        notification_type: NotificationType,
        dry_run: bool = False,
    ) -> NotificationResponse:
        """Send one email and write the log entry to DynamoDB."""
        status = NotificationStatus.SENT
        error_message: str | None = None

        if dry_run:
            logger.info(
                "DRY RUN — would send email",
                recipient=recipient_email,
                subject=subject,
                notification_type=notification_type,
            )
        elif self._settings.is_local:
            logger.info(
                "LOCAL — skipping SES send",
                recipient=recipient_email,
                subject=subject,
                notification_type=notification_type,
            )
        else:
            try:
                self._ses.send_email(
                    Source=f"{self._settings.ses_sender_name} <{self._settings.ses_sender_email}>",
                    Destination={"ToAddresses": [recipient_email]},
                    Message={
                        "Subject": {"Data": subject, "Charset": "UTF-8"},
                        "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
                    },
                )
                logger.info("Email sent", recipient=recipient_email, subject=subject)
            except ClientError as exc:
                error_message = exc.response["Error"]["Message"]
                status = NotificationStatus.FAILED
                logger.error("SES send failed", error=error_message, recipient=recipient_email)

        item = NotificationDynamoItem.create(
            notification_type=notification_type,
            channel=NotificationChannel.EMAIL,
            status=status,
            subject=subject,
            student_id=student_id,
            student_name=student_name,
            recipient_email=recipient_email if not dry_run else None,
            error_message=error_message,
        )

        if not dry_run:
            self._notif_repo.save(item)

        return item.to_response()
