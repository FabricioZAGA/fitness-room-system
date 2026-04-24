"""Event-driven notification dispatcher.

Provides a fire-and-forget API for all business events that trigger
notifications.  Each ``notify_*`` method:

1. Builds the appropriate email HTML and SMS text.
2. Sends via SES (email) and optionally SNS (SMS).
3. Logs every attempt to DynamoDB for audit.

Usage from any router / service::

    from src.services.event_notifier import EventNotifier
    notifier = EventNotifier()
    notifier.notify_reservation_confirmed(student, class_item)

In local mode, emails/SMS are **not** sent — they are logged at INFO level.
"""

from __future__ import annotations

from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import boto3
from aws_lambda_powertools import Logger

from src.config import get_settings
from src.models.notification import (
    NotificationChannel,
    NotificationDynamoItem,
    NotificationStatus,
    NotificationType,
)
from src.repositories.instructor_repository import InstructorRepository
from src.repositories.notification_repository import NotificationRepository
from src.services.carta_responsiva import generate_carta_responsiva
from src.services.email_templates import (
    admin_membership_expired_html,
    admin_new_student_html,
    class_cancelled_html,
    class_reminder_html,
    instructor_class_assigned_html,
    instructor_class_cancelled_html,
    instructor_class_full_html,
    instructor_student_cancelled_html,
    instructor_student_enrolled_html,
    membership_created_html,
    membership_frozen_html,
    membership_unfrozen_html,
    portal_credentials_html,
    reservation_cancelled_html,
    reservation_confirmed_html,
    waitlist_joined_html,
    waitlist_promoted_html,
    welcome_carta_responsiva_html,
)

logger = Logger()

MEMBERSHIP_TYPE_LABELS: dict[str, str] = {
    "monthly": "Mensual",
    "quarterly": "Trimestral",
    "semi_annual": "Semestral",
    "annual": "Anual",
    "class_pack_5": "Pack 5 Clases",
    "class_pack_10": "Pack 10 Clases",
    "class_pack_20": "Pack 20 Clases",
    "day_pass": "Pase de Día",
}

# ─── SMS text templates (max ~160 chars) ──────────────────────────────────────

_SMS: dict[str, str] = {
    "reservation_confirmed": "{gym}: Tu lugar en {class_type} ({date} {time}) está confirmado. ¡Te esperamos!",
    "reservation_cancelled": "{gym}: Tu reservación para {class_type} ({date} {time}) fue cancelada.",
    "waitlist_joined": "{gym}: Estás en lista de espera #{position} para {class_type} ({date} {time}).",
    "waitlist_promoted": "{gym}: ¡Se liberó un lugar! Tu reservación para {class_type} ({date} {time}) está confirmada.",
    "class_cancelled": "{gym}: La clase {class_type} ({date} {time}) fue cancelada.",
    "class_reminder": "{gym}: Tu clase {class_type} empieza pronto hoy a las {time}. ¡No faltes!",
    "membership_created": "{gym}: ¡Bienvenido! Tu membresía {plan} está activa hasta {end_date}.",
    "membership_frozen": "{gym}: Tu membresía fue congelada por {days} días.",
    "membership_unfrozen": "{gym}: Tu membresía está activa de nuevo. Nueva fecha de vencimiento: {end_date}.",
    "instructor_student_enrolled": "{gym}: {student} se inscribió en tu clase {class_type} ({date} {time}). Ocupación: {count}/{cap}.",
    "instructor_student_cancelled": "{gym}: {student} canceló {class_type} ({date} {time}). Ocupación: {count}/{cap}.",
    "instructor_class_full": "{gym}: ¡Tu clase {class_type} ({date} {time}) está llena!",
    "instructor_class_assigned": "{gym}: Se te asignó {class_type} el {date} a las {time}.",
    "instructor_class_cancelled": "{gym}: Tu clase {class_type} ({date} {time}) fue cancelada.",
    "admin_new_student": "{gym}: Nuevo alumno registrado: {student} ({email}).",
}


class EventNotifier:
    """Fire-and-forget notification dispatcher for all business events."""

    def __init__(
        self,
        notification_repo: NotificationRepository | None = None,
        instructor_repo: InstructorRepository | None = None,
    ) -> None:
        self._settings = get_settings()
        self._notif_repo = notification_repo or NotificationRepository()
        self._instructor_repo = instructor_repo or InstructorRepository()
        self._ses = boto3.client("ses", region_name=self._settings.aws_region)
        self._sns = boto3.client("sns", region_name=self._settings.aws_region)
        self._gym = self._settings.ses_sender_name

    # ──────────────────────────────────────────────────────────────────────────
    # Student events
    # ──────────────────────────────────────────────────────────────────────────

    def notify_reservation_confirmed(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
        instructor_name: str,
        location: str,
    ) -> None:
        """Student enrolled and got a confirmed spot."""
        html = reservation_confirmed_html(
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            instructor_name=instructor_name,
            location=location,
            gym_name=self._gym,
        )
        sms = _SMS["reservation_confirmed"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.RESERVATION_CONFIRMED,
            subject=f"Reservación confirmada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_reservation_cancelled(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
    ) -> None:
        """Student (or admin) cancelled a reservation."""
        html = reservation_cancelled_html(
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            gym_name=self._gym,
        )
        sms = _SMS["reservation_cancelled"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.RESERVATION_CANCELLED,
            subject=f"Reservación cancelada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_waitlist_joined(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
        position: int,
    ) -> None:
        """Student joined waitlist for a full class."""
        html = waitlist_joined_html(
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            position=position,
            gym_name=self._gym,
        )
        sms = _SMS["waitlist_joined"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
            position=position,
        )
        self._dispatch(
            notification_type=NotificationType.WAITLIST_JOINED,
            subject=f"Lista de espera — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_waitlist_promoted(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
    ) -> None:
        """Student promoted from waitlist → confirmed."""
        html = waitlist_promoted_html(
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            gym_name=self._gym,
        )
        sms = _SMS["waitlist_promoted"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.WAITLIST_PROMOTED,
            subject=f"¡Lugar confirmado! — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_class_cancelled_to_students(
        self,
        students: list[dict[str, Any]],
        class_type: str,
        class_date: str,
        start_time: str,
        instructor_name: str,
    ) -> None:
        """Notify all enrolled students that a class was cancelled."""
        for s in students:
            name = s.get("name", "Alumno")
            email = s.get("email")
            phone = s.get("phone")
            if not email:
                continue
            html = class_cancelled_html(
                student_name=name,
                class_type=class_type,
                class_date=class_date,
                start_time=start_time,
                instructor_name=instructor_name,
                gym_name=self._gym,
            )
            sms = _SMS["class_cancelled"].format(
                gym=self._gym, class_type=class_type, date=class_date, time=start_time,
            )
            self._dispatch(
                notification_type=NotificationType.CLASS_CANCELLED,
                subject=f"Clase cancelada — {self._gym}",
                html_body=html,
                sms_body=sms,
                recipient_email=email,
                recipient_phone=phone,
                recipient_role="student",
                student_name=name,
            )

    def notify_class_reminder(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
        instructor_name: str,
        location: str,
    ) -> None:
        """Reminder before class starts (e.g. 1h before)."""
        html = class_reminder_html(
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            instructor_name=instructor_name,
            location=location,
            gym_name=self._gym,
        )
        sms = _SMS["class_reminder"].format(
            gym=self._gym, class_type=class_type, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.CLASS_REMINDER,
            subject=f"Tu clase empieza pronto — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_membership_created(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        membership_type: str,
        start_date: str,
        end_date: str,
    ) -> None:
        """New membership activated for student."""
        label = MEMBERSHIP_TYPE_LABELS.get(membership_type, membership_type)
        html = membership_created_html(
            student_name=student_name,
            membership_type=label,
            start_date=start_date,
            end_date=end_date,
            gym_name=self._gym,
        )
        sms = _SMS["membership_created"].format(
            gym=self._gym, plan=label, end_date=end_date,
        )
        self._dispatch(
            notification_type=NotificationType.MEMBERSHIP_CREATED,
            subject=f"Membresía activada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_membership_frozen(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        freeze_days: int,
    ) -> None:
        """Membership was frozen."""
        html = membership_frozen_html(
            student_name=student_name,
            freeze_days=freeze_days,
            gym_name=self._gym,
        )
        sms = _SMS["membership_frozen"].format(gym=self._gym, days=freeze_days)
        self._dispatch(
            notification_type=NotificationType.MEMBERSHIP_FROZEN,
            subject=f"Membresía congelada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    def notify_membership_unfrozen(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None,
        new_end_date: str,
    ) -> None:
        """Membership was unfrozen."""
        html = membership_unfrozen_html(
            student_name=student_name,
            new_end_date=new_end_date,
            gym_name=self._gym,
        )
        sms = _SMS["membership_unfrozen"].format(gym=self._gym, end_date=new_end_date)
        self._dispatch(
            notification_type=NotificationType.MEMBERSHIP_UNFROZEN,
            subject=f"Membresía reactivada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_phone=student_phone,
            recipient_role="student",
            student_name=student_name,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Welcome / Carta Responsiva
    # ──────────────────────────────────────────────────────────────────────────

    def notify_welcome_carta_responsiva(
        self,
        student_name: str,
        student_email: str,
        student_phone: str | None = None,
    ) -> None:
        """Generate carta responsiva PDF and send welcome email with attachment."""
        subject = f"¡Bienvenido a {self._gym}! — Carta Responsiva"
        html = welcome_carta_responsiva_html(
            student_name=student_name,
            gym_name=self._gym,
        )
        # Generate PDF
        pdf_bytes = generate_carta_responsiva(
            student_name=student_name,
            student_email=student_email,
            gym_name=self._gym,
        )
        filename = f"Carta_Responsiva_{student_name.replace(' ', '_')}.pdf"

        try:
            self._send_email_with_attachment(
                recipient=student_email,
                subject=subject,
                html_body=html,
                attachment_bytes=pdf_bytes,
                attachment_filename=filename,
                attachment_mime="application/pdf",
            )
            self._log(
                notification_type=NotificationType.CUSTOM,
                channel=NotificationChannel.EMAIL,
                status=NotificationStatus.SENT,
                subject=subject,
                recipient_email=student_email,
                recipient_role="student",
                student_name=student_name,
            )
        except Exception as exc:
            logger.error(
                "Welcome carta responsiva email failed",
                recipient=student_email,
                error=str(exc),
            )
            self._log(
                notification_type=NotificationType.CUSTOM,
                channel=NotificationChannel.EMAIL,
                status=NotificationStatus.FAILED,
                subject=subject,
                recipient_email=student_email,
                recipient_role="student",
                student_name=student_name,
                error_message=str(exc),
            )

    # ──────────────────────────────────────────────────────────────────────────
    # Portal credentials
    # ──────────────────────────────────────────────────────────────────────────

    def notify_portal_credentials(
        self,
        student_name: str,
        student_email: str,
        password: str,
        portal_url: str = "https://portal.fitnessroom.mx",
    ) -> None:
        """Send portal access credentials to a newly registered student."""
        html = portal_credentials_html(
            student_name=student_name,
            email=student_email,
            password=password,
            portal_url=portal_url,
            gym_name=self._gym,
        )
        sms = (
            f"{self._gym}: Tu acceso al portal de alumnos — "
            f"Entra a {portal_url} con {student_email} / {password}"
        )
        self._dispatch(
            notification_type=NotificationType.CUSTOM,
            subject=f"🔐 Acceso al Portal de Alumnos — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=student_email,
            recipient_role="student",
            student_name=student_name,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Instructor events
    # ──────────────────────────────────────────────────────────────────────────

    def notify_instructor_student_enrolled(
        self,
        instructor_name: str,
        instructor_email: str,
        instructor_phone: str | None,
        student_name: str,
        class_type: str,
        class_date: str,
        start_time: str,
        reservations_count: int,
        capacity: int,
    ) -> None:
        """Instructor: a student enrolled in their class."""
        html = instructor_student_enrolled_html(
            instructor_name=instructor_name,
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            reservations_count=reservations_count,
            capacity=capacity,
            gym_name=self._gym,
        )
        sms = _SMS["instructor_student_enrolled"].format(
            gym=self._gym, student=student_name, class_type=class_type,
            date=class_date, time=start_time, count=reservations_count, cap=capacity,
        )
        self._dispatch(
            notification_type=NotificationType.INSTRUCTOR_STUDENT_ENROLLED,
            subject=f"Nueva inscripción en tu clase — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=instructor_email,
            recipient_phone=instructor_phone,
            recipient_role="instructor",
        )

    def notify_instructor_student_cancelled(
        self,
        instructor_name: str,
        instructor_email: str,
        instructor_phone: str | None,
        student_name: str,
        class_type: str,
        class_date: str,
        start_time: str,
        reservations_count: int,
        capacity: int,
    ) -> None:
        """Instructor: a student cancelled their reservation."""
        html = instructor_student_cancelled_html(
            instructor_name=instructor_name,
            student_name=student_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            reservations_count=reservations_count,
            capacity=capacity,
            gym_name=self._gym,
        )
        sms = _SMS["instructor_student_cancelled"].format(
            gym=self._gym, student=student_name, class_type=class_type,
            date=class_date, time=start_time, count=reservations_count, cap=capacity,
        )
        self._dispatch(
            notification_type=NotificationType.INSTRUCTOR_STUDENT_CANCELLED,
            subject=f"Cancelación en tu clase — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=instructor_email,
            recipient_phone=instructor_phone,
            recipient_role="instructor",
        )

    def notify_instructor_class_full(
        self,
        instructor_name: str,
        instructor_email: str,
        instructor_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
        capacity: int,
        waitlist_count: int,
    ) -> None:
        """Instructor: their class just reached full capacity."""
        html = instructor_class_full_html(
            instructor_name=instructor_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            capacity=capacity,
            waitlist_count=waitlist_count,
            gym_name=self._gym,
        )
        sms = _SMS["instructor_class_full"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.INSTRUCTOR_CLASS_FULL,
            subject=f"¡Tu clase está llena! — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=instructor_email,
            recipient_phone=instructor_phone,
            recipient_role="instructor",
        )

    def notify_instructor_class_assigned(
        self,
        instructor_name: str,
        instructor_email: str,
        instructor_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
        duration_minutes: int,
        location: str,
    ) -> None:
        """Instructor: assigned to a new class."""
        html = instructor_class_assigned_html(
            instructor_name=instructor_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            duration_minutes=duration_minutes,
            location=location,
            gym_name=self._gym,
        )
        sms = _SMS["instructor_class_assigned"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.INSTRUCTOR_CLASS_ASSIGNED,
            subject=f"Clase asignada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=instructor_email,
            recipient_phone=instructor_phone,
            recipient_role="instructor",
        )

    def notify_instructor_class_cancelled(
        self,
        instructor_name: str,
        instructor_email: str,
        instructor_phone: str | None,
        class_type: str,
        class_date: str,
        start_time: str,
    ) -> None:
        """Instructor: their class was cancelled by admin."""
        html = instructor_class_cancelled_html(
            instructor_name=instructor_name,
            class_type=class_type,
            class_date=class_date,
            start_time=start_time,
            gym_name=self._gym,
        )
        sms = _SMS["instructor_class_cancelled"].format(
            gym=self._gym, class_type=class_type, date=class_date, time=start_time,
        )
        self._dispatch(
            notification_type=NotificationType.INSTRUCTOR_CLASS_CANCELLED,
            subject=f"Tu clase fue cancelada — {self._gym}",
            html_body=html,
            sms_body=sms,
            recipient_email=instructor_email,
            recipient_phone=instructor_phone,
            recipient_role="instructor",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Admin events
    # ──────────────────────────────────────────────────────────────────────────

    def notify_admin_new_student(
        self,
        student_name: str,
        student_email: str,
        admin_emails: list[str],
    ) -> None:
        """Notify admins that a new student was registered."""
        html = admin_new_student_html(
            student_name=student_name,
            student_email=student_email,
            gym_name=self._gym,
        )
        sms = _SMS["admin_new_student"].format(
            gym=self._gym, student=student_name, email=student_email,
        )
        for admin_email in admin_emails:
            self._dispatch(
                notification_type=NotificationType.ADMIN_NEW_STUDENT,
                subject=f"Nuevo alumno registrado — {self._gym}",
                html_body=html,
                sms_body=sms,
                recipient_email=admin_email,
                recipient_role="admin",
            )

    def notify_admin_membership_expired(
        self,
        student_name: str,
        membership_type: str,
        expired_date: str,
        admin_emails: list[str],
    ) -> None:
        """Notify admins that a membership has expired."""
        label = MEMBERSHIP_TYPE_LABELS.get(membership_type, membership_type)
        html = admin_membership_expired_html(
            student_name=student_name,
            membership_type=label,
            expired_date=expired_date,
            gym_name=self._gym,
        )
        for admin_email in admin_emails:
            self._dispatch(
                notification_type=NotificationType.ADMIN_MEMBERSHIP_EXPIRED,
                subject=f"Membresía expirada — {self._gym}",
                html_body=html,
                recipient_email=admin_email,
                recipient_role="admin",
            )

    # ──────────────────────────────────────────────────────────────────────────
    # Instructor resolver helper
    # ──────────────────────────────────────────────────────────────────────────

    def resolve_instructor_for_class(self, instructor_name: str) -> dict[str, Any] | None:
        """Try to find instructor record by name match. Returns dict with name/email/phone."""
        try:
            instructors, _ = self._instructor_repo.list_all(limit=200)
            for inst in instructors:
                full = f"{inst.first_name} {inst.last_name}"
                if full.lower() == instructor_name.lower():
                    return {
                        "name": full,
                        "email": inst.email,
                        "phone": inst.phone,
                    }
        except Exception as exc:
            logger.warning("Could not resolve instructor", error=str(exc))
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # Internal dispatch
    # ──────────────────────────────────────────────────────────────────────────

    def _dispatch(
        self,
        notification_type: NotificationType,
        subject: str,
        html_body: str,
        sms_body: str | None = None,
        recipient_email: str | None = None,
        recipient_phone: str | None = None,
        recipient_role: str | None = None,
        student_name: str | None = None,
        student_id: str | None = None,
    ) -> None:
        """Send email + optional SMS, log both to DynamoDB. Never raises."""
        # ── Email ────────────────────────────────────────────────────────
        if recipient_email:
            try:
                self._send_email(recipient_email, subject, html_body)
                self._log(
                    notification_type=notification_type,
                    channel=NotificationChannel.EMAIL,
                    status=NotificationStatus.SENT,
                    subject=subject,
                    recipient_email=recipient_email,
                    recipient_role=recipient_role,
                    student_name=student_name,
                    student_id=student_id,
                )
            except Exception as exc:
                logger.error(
                    "Email dispatch failed",
                    notification_type=notification_type,
                    recipient=recipient_email,
                    error=str(exc),
                )
                self._log(
                    notification_type=notification_type,
                    channel=NotificationChannel.EMAIL,
                    status=NotificationStatus.FAILED,
                    subject=subject,
                    recipient_email=recipient_email,
                    recipient_role=recipient_role,
                    student_name=student_name,
                    student_id=student_id,
                    error_message=str(exc),
                )

        # ── SMS ──────────────────────────────────────────────────────────
        if sms_body and recipient_phone and self._settings.sms_enabled:
            try:
                self._send_sms(recipient_phone, sms_body)
                self._log(
                    notification_type=notification_type,
                    channel=NotificationChannel.SMS,
                    status=NotificationStatus.SENT,
                    subject=subject,
                    recipient_phone=recipient_phone,
                    recipient_role=recipient_role,
                    student_name=student_name,
                    student_id=student_id,
                )
            except Exception as exc:
                logger.error(
                    "SMS dispatch failed",
                    notification_type=notification_type,
                    recipient_phone=recipient_phone,
                    error=str(exc),
                )
                self._log(
                    notification_type=notification_type,
                    channel=NotificationChannel.SMS,
                    status=NotificationStatus.FAILED,
                    subject=subject,
                    recipient_phone=recipient_phone,
                    recipient_role=recipient_role,
                    student_name=student_name,
                    student_id=student_id,
                    error_message=str(exc),
                )

    def _send_email(self, recipient: str, subject: str, html_body: str) -> None:
        """Send email via SES (skipped in local mode)."""
        if self._settings.is_local:
            logger.info("LOCAL — skip SES", recipient=recipient, subject=subject)
            return
        self._ses.send_email(
            Source=f"{self._settings.ses_sender_name} <{self._settings.ses_sender_email}>",
            Destination={"ToAddresses": [recipient]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
            },
        )
        logger.info("Email sent", recipient=recipient, subject=subject)

    def _send_email_with_attachment(
        self,
        recipient: str,
        subject: str,
        html_body: str,
        attachment_bytes: bytes,
        attachment_filename: str,
        attachment_mime: str = "application/pdf",
    ) -> None:
        """Send email with a file attachment via SES raw email (skipped in local mode)."""
        if self._settings.is_local:
            logger.info(
                "LOCAL — skip SES (attachment)",
                recipient=recipient,
                subject=subject,
                attachment=attachment_filename,
                attachment_size=len(attachment_bytes),
            )
            return

        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{self._settings.ses_sender_name} <{self._settings.ses_sender_email}>"
        msg["To"] = recipient

        # HTML body part
        body_part = MIMEText(html_body, "html", "utf-8")
        msg.attach(body_part)

        # Attachment part
        att = MIMEApplication(attachment_bytes)
        att.add_header("Content-Disposition", "attachment", filename=attachment_filename)
        att.add_header("Content-Type", attachment_mime, name=attachment_filename)
        msg.attach(att)

        self._ses.send_raw_email(
            Source=msg["From"],
            Destinations=[recipient],
            RawMessage={"Data": msg.as_string()},
        )
        logger.info(
            "Email with attachment sent",
            recipient=recipient,
            subject=subject,
            attachment=attachment_filename,
        )

    def _send_sms(self, phone: str, message: str) -> None:
        """Send SMS via SNS (skipped in local mode)."""
        if self._settings.is_local:
            logger.info("LOCAL — skip SNS SMS", phone=phone, message=message[:60])
            return
        self._sns.publish(
            PhoneNumber=phone,
            Message=message,
            MessageAttributes={
                "AWS.SNS.SMS.SenderID": {
                    "DataType": "String",
                    "StringValue": self._settings.sms_sender_id,
                },
                "AWS.SNS.SMS.SMSType": {
                    "DataType": "String",
                    "StringValue": "Transactional",
                },
            },
        )
        logger.info("SMS sent", phone=phone)

    def _log(
        self,
        notification_type: NotificationType,
        channel: NotificationChannel,
        status: NotificationStatus,
        subject: str,
        recipient_email: str | None = None,
        recipient_phone: str | None = None,
        recipient_role: str | None = None,
        student_name: str | None = None,
        student_id: str | None = None,
        error_message: str | None = None,
    ) -> None:
        """Persist notification log to DynamoDB."""
        try:
            item = NotificationDynamoItem.create(
                notification_type=notification_type,
                channel=channel,
                status=status,
                subject=subject,
                student_id=student_id,
                student_name=student_name,
                recipient_email=recipient_email,
                recipient_phone=recipient_phone,
                recipient_role=recipient_role,
                error_message=error_message,
            )
            self._notif_repo.save(item)
        except Exception as exc:
            logger.error("Failed to log notification", error=str(exc))
