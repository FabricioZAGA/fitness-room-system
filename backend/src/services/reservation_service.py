"""Reservation service — business logic for class reservations and waitlist."""

from datetime import datetime, timedelta
from typing import Any

from aws_lambda_powertools import Logger

from src.models.common import MX_TZ, mexico_now
from src.models.reservation import ReservationCreate, ReservationResponse
from src.repositories.class_repository import ClassRepository
from src.repositories.membership_repository import MembershipRepository
from src.repositories.reservation_repository import ReservationRepository
from src.repositories.student_repository import StudentRepository
from src.utils.exceptions import (
    raise_bad_request,
    raise_conflict,
)

MIN_BOOKING_MINUTES = 5
MIN_CANCEL_MINUTES = 15

logger = Logger()


class ReservationService:
    """Service for reservation and waitlist business logic."""

    def __init__(
        self,
        reservation_repo: ReservationRepository | None = None,
        class_repo: ClassRepository | None = None,
        student_repo: StudentRepository | None = None,
        membership_repo: MembershipRepository | None = None,
    ) -> None:
        self._reservation_repo = reservation_repo or ReservationRepository()
        self._class_repo = class_repo or ClassRepository()
        self._student_repo = student_repo or StudentRepository()
        self._membership_repo = membership_repo or MembershipRepository()

    def create_reservation(
        self, data: ReservationCreate, *, staff_override: bool = False,
    ) -> ReservationResponse:
        """Reserve a spot in a class for a student.

        Business rules:
        1. Student must exist
        2. Class must exist and not be cancelled
        3. Student must NOT already have a reservation
        4. If capacity is available → create confirmed reservation
        5. If class is full → add to waitlist automatically

        Args:
            data: Reservation creation payload.
            staff_override: If True, skip booking window and daily limit (walk-in).

        Returns:
            The created reservation (confirmed or waitlisted).
        """
        logger.info(
            "Creating reservation",
            extra={"student_id": data.student_id, "class_id": data.class_id},
        )

        self._student_repo.get_by_id(data.student_id)

        class_item = self._class_repo.get_by_id(data.class_id)

        if class_item.is_cancelled:
            raise_bad_request(f"Class '{data.class_id}' has been cancelled.")

        if not staff_override:
            self._check_booking_window(class_item)
            self._check_daily_limit(data.student_id, class_item.class_date)

        existing = self._reservation_repo.get_reservation(data.class_id, data.student_id)
        if existing and existing.status in ("confirmed", "waitlisted"):
            raise_conflict(
                f"Student '{data.student_id}' already has a reservation "
                f"for class '{data.class_id}'."
            )
        # If a cancelled/attended/no_show record exists, delete it first so we can create fresh
        if existing and existing.status not in ("confirmed", "waitlisted"):
            self._reservation_repo.delete_item(
                f"CLASS#{data.class_id}", f"RESERVATION#{data.student_id}"
            )

        class_date = class_item.class_date
        available_spots = class_item.capacity - class_item.reservations_count

        if available_spots > 0:
            reservation = self._reservation_repo.create_reservation(data, class_date)
            self._class_repo.increment_reservations_count(data.class_id)
            logger.info(
                "Reservation confirmed", extra={"reservation_id": reservation.reservation_id}
            )
            return reservation.to_response()

        position = self._reservation_repo.get_next_waitlist_position(data.class_id)
        waitlist_item = self._reservation_repo.add_to_waitlist(data, class_date, position)
        self._class_repo.increment_waitlist_count(data.class_id)
        logger.info("Added to waitlist", extra={"position": position})
        return waitlist_item.to_response()

    def cancel_reservation(
        self, class_id: str, student_id: str
    ) -> tuple[ReservationResponse, str | None]:
        """Cancel a confirmed reservation and promote first waitlisted student.

        Args:
            class_id: The class ID.
            student_id: The student's ID.

        Returns:
            Tuple of (cancelled reservation, promoted_student_id or None).
        """
        logger.info(
            "Cancelling reservation",
            extra={"student_id": student_id, "class_id": class_id},
        )

        existing = self._reservation_repo.get_reservation(class_id, student_id)
        if existing is None:
            raise_bad_request(
                f"No reservation found for student '{student_id}' in class '{class_id}'."
            )

        class_item = self._class_repo.get_by_id(class_id)
        self._check_cancel_window(class_item)

        cancelled = self._reservation_repo.cancel_reservation(class_id, student_id)
        self._class_repo.decrement_reservations_count(class_id)

        promoted_student_id: str | None = None
        class_item = self._class_repo.get_by_id(class_id)
        promoted = self._reservation_repo.promote_from_waitlist(class_id, class_item.class_date)
        if promoted:
            self._class_repo.increment_reservations_count(class_id)
            self._class_repo.decrement_waitlist_count(class_id)
            promoted_student_id = promoted.student_id
            logger.info(
                "Promoted from waitlist",
                extra={"promoted_student_id": promoted.student_id},
            )

        return cancelled.to_response(), promoted_student_id

    def list_reservations_for_class(
        self,
        class_id: str,
        limit: int = 100,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ReservationResponse], dict[str, Any] | None]:
        """List all confirmed reservations for a class."""
        self._class_repo.get_by_id(class_id)
        items, next_key = self._reservation_repo.list_for_class(
            class_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def list_reservations_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ReservationResponse], dict[str, Any] | None]:
        """List all reservations for a student across all classes."""
        self._student_repo.get_by_id(student_id)
        items, next_key = self._reservation_repo.list_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def mark_attendance(
        self,
        class_id: str,
        student_id: str,
        attended: bool,
    ) -> ReservationResponse:
        """Mark a student as attended or no-show for a class session.

        Only confirmed reservations can be marked. Waitlisted, cancelled, or
        already-marked reservations are rejected.

        If attended=True and the student has a class-pack membership,
        decrements classes_remaining atomically.

        Args:
            class_id: The class ID.
            student_id: The student's ID.
            attended: True if attended, False for no-show.

        Returns:
            The updated reservation.
        """
        logger.info(
            "Marking attendance",
            extra={"student_id": student_id, "class_id": class_id, "attended": attended},
        )

        existing = self._reservation_repo.get_reservation(class_id, student_id)
        if existing is None:
            raise_bad_request(
                f"No reservation found for student '{student_id}' in class '{class_id}'."
            )
        if existing.status != "confirmed":
            raise_bad_request(
                f"Cannot mark attendance for reservation with status '{existing.status}'. "
                f"Only confirmed reservations can be marked."
            )

        item = self._reservation_repo.mark_attendance(class_id, student_id, attended)

        # Decrement class pack counter if student attended
        if attended:
            active_membership = self._membership_repo.get_active_for_student(student_id)
            if (
                active_membership is not None
                and active_membership.classes_remaining is not None
                and active_membership.classes_remaining > 0
            ):
                self._membership_repo.decrement_classes_remaining(
                    student_id=student_id,
                    membership_id=active_membership.membership_id,
                )
                logger.info(
                    "Decremented class pack counter",
                    extra={
                        "student_id": student_id,
                        "membership_id": active_membership.membership_id,
                        "remaining_before": active_membership.classes_remaining,
                    },
                )

        return item.to_response()

    def get_waitlist_for_class(
        self,
        class_id: str,
        limit: int = 50,
    ) -> list[ReservationResponse]:
        """Get ordered waitlist for a class."""
        self._class_repo.get_by_id(class_id)
        items, _ = self._reservation_repo.get_waitlist_for_class(class_id, limit=limit)
        return [i.to_response() for i in items]

    # ------------------------------------------------------------------
    # Daily limit per membership type
    # ------------------------------------------------------------------

    ONE_SESSION_MEMBERSHIPS = {"founder", "room_daily", "room_pass", "founder_monthly"}

    def _check_daily_limit(self, student_id: str, class_date: str) -> None:
        """Raise 400 if a 1-session/day member already has a confirmed reservation on the same day."""
        active = self._membership_repo.get_active_for_student(student_id)
        if active is None:
            return
        if active.membership_type not in self.ONE_SESSION_MEMBERSHIPS:
            return

        reservations, _ = self._reservation_repo.list_for_student(student_id, limit=200)
        # Include "attended" so a Founder who already checked in to today's class
        # cannot reserve a second one the same day.
        same_day_active = [
            r for r in reservations
            if r.class_date == class_date
            and r.status in ("confirmed", "attended", "waitlisted")
        ]
        if same_day_active:
            raise_bad_request(
                "Tu membresía solo permite 1 clase por día. "
                "Ya tienes una reservación para esta fecha."
            )

    # ------------------------------------------------------------------
    # Time window checks
    # ------------------------------------------------------------------

    @staticmethod
    def _class_start_datetime(class_item: Any) -> datetime:
        """Build a timezone-aware datetime from class_date + start_time strings."""
        date_str = str(class_item.class_date)
        time_str = str(class_item.start_time)[:5]  # "HH:MM"
        naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        return naive.replace(tzinfo=MX_TZ)

    def _check_booking_window(self, class_item: Any) -> None:
        """Raise 400 if booking is attempted less than MIN_BOOKING_MINUTES before class start."""
        class_start = self._class_start_datetime(class_item)
        now = mexico_now()
        diff = class_start - now
        if diff < timedelta(minutes=MIN_BOOKING_MINUTES):
            raise_bad_request(
                f"No se puede reservar con menos de {MIN_BOOKING_MINUTES} minutos de anticipación. "
                f"La clase inicia a las {str(class_item.start_time)[:5]}."
            )

    def _check_cancel_window(self, class_item: Any) -> None:
        """Raise 400 if cancellation is attempted less than MIN_CANCEL_MINUTES before class start."""
        class_start = self._class_start_datetime(class_item)
        now = mexico_now()
        diff = class_start - now
        if diff < timedelta(minutes=MIN_CANCEL_MINUTES):
            raise_bad_request(
                f"No se puede cancelar con menos de {MIN_CANCEL_MINUTES} minutos de anticipación. "
                f"La clase inicia a las {str(class_item.start_time)[:5]}."
            )
