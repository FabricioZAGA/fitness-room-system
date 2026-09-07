"""Check-in service — validates and records gym entry events."""

from aws_lambda_powertools import Logger

from src.models.checkin import CheckinDynamoItem, CheckinReason, CheckinResponse
from src.models.common import mexico_now, mexico_today
from src.models.student import StudentStatus
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository

logger = Logger()


class CheckinService:
    """Service for gym entry check-in operations."""

    def __init__(
        self,
        student_repo: StudentRepository | None = None,
        membership_repo: MembershipRepository | None = None,
    ) -> None:
        self._student_repo = student_repo or StudentRepository()
        self._membership_repo = membership_repo or MembershipRepository()

    def checkin(self, student_id: str) -> CheckinResponse:
        """Record a gym entry check-in attempt for a student.

        Validation order:
        1. Student exists (raises 404 if not)
        2. Student status is active or founder
        3. Student has an active membership
        4. Membership is not expired (days_until_expiry > 0)

        Always records the attempt regardless of outcome.

        Args:
            student_id: The student's unique identifier.

        Returns:
            CheckinResponse with can_enter flag and reason.
        """
        logger.info("Processing check-in", extra={"student_id": student_id})

        # Step 1: Verify student exists (raises ResourceNotFoundException → 404 if not)
        student = self._student_repo.get_by_id(student_id)

        # Step 2: Check student status — only active students can enter
        if student.status != StudentStatus.ACTIVE.value:
            reason = (
                CheckinReason.SUSPENDED
                if student.status == StudentStatus.SUSPENDED.value
                else CheckinReason.INACTIVE
            )
            item = CheckinDynamoItem.create(student_id, False, reason)
            self._student_repo.put_checkin(item)
            logger.warning(
                "Check-in denied: student not active",
                extra={"student_id": student_id, "status": student.status},
            )
            return CheckinResponse(
                checkin_id=item.checkin_id,
                student_id=student_id,
                checked_in_at=item.checked_in_at,
                can_enter=False,
                reason=reason,
            )

        # Step 3: Check active membership
        active_membership = self._membership_repo.get_active_for_student(student_id)
        if not active_membership:
            item = CheckinDynamoItem.create(student_id, False, CheckinReason.NO_MEMBERSHIP)
            self._student_repo.put_checkin(item)
            logger.warning("Check-in denied: no membership", extra={"student_id": student_id})
            return CheckinResponse(
                checkin_id=item.checkin_id,
                student_id=student_id,
                checked_in_at=item.checked_in_at,
                can_enter=False,
                reason=CheckinReason.NO_MEMBERSHIP,
            )

        # Step 4: Check expiry
        membership_response = active_membership.to_response()
        days = membership_response.days_until_expiry or 0

        if days <= 0:
            item = CheckinDynamoItem.create(student_id, False, CheckinReason.EXPIRED)
            self._student_repo.put_checkin(item)
            logger.warning("Check-in denied: expired membership", extra={"student_id": student_id})
            return CheckinResponse(
                checkin_id=item.checkin_id,
                student_id=student_id,
                checked_in_at=item.checked_in_at,
                can_enter=False,
                reason=CheckinReason.EXPIRED,
                days_until_expiry=0,
                membership_type=active_membership.membership_type,
            )

        # All checks passed — entry allowed
        reason = CheckinReason.EXPIRING_SOON if days <= 7 else CheckinReason.ALL_GOOD
        item = CheckinDynamoItem.create(student_id, True, reason)
        self._student_repo.put_checkin(item)

        logger.info(
            "Check-in approved",
            extra={"student_id": student_id, "days_until_expiry": days},
        )

        self._auto_mark_todays_reservation(student_id)
        return CheckinResponse(
            checkin_id=item.checkin_id,
            student_id=student_id,
            checked_in_at=item.checked_in_at,
            can_enter=True,
            reason=reason,
            days_until_expiry=days,
            membership_type=active_membership.membership_type,
        )

    def _auto_mark_todays_reservation(self, student_id: str) -> None:
        """Best-effort: mark the student's confirmed reservation for today as attended.

        Picks the class whose start time is closest to now (a student may have
        more than one class the same day). Never raises — a failure here must
        not block the physical check-in.
        """
        try:
            from src.repositories.class_repository import ClassRepository
            from src.repositories.reservation_repository import ReservationRepository
            from src.services.reservation_service import ReservationService

            res_repo = ReservationRepository()
            class_repo = ClassRepository()
            today = mexico_today().isoformat()
            now_minutes = mexico_now().hour * 60 + mexico_now().minute

            reservations, _ = res_repo.list_for_student(student_id, limit=50)
            candidates = [
                r for r in reservations
                if r.class_date == today and r.status == "confirmed"
            ]
            if not candidates:
                return

            def _distance(r: object) -> int:
                try:
                    cls = class_repo.get_by_id(getattr(r, "class_id"))
                    hh, mm = str(cls.start_time)[:5].split(":")
                    return abs(int(hh) * 60 + int(mm) - now_minutes)
                except Exception:
                    return 10_000

            target = min(candidates, key=_distance)
            ReservationService(
                reservation_repo=res_repo,
                class_repo=class_repo,
                student_repo=self._student_repo,
                membership_repo=self._membership_repo,
            ).mark_attendance(target.class_id, student_id, attended=True)
            logger.info(
                "Auto-marked reservation as attended on check-in",
                extra={"student_id": student_id, "class_id": target.class_id},
            )
        except Exception:
            logger.warning(
                "Auto-mark attendance on check-in failed",
                extra={"student_id": student_id},
            )
