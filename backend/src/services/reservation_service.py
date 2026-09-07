"""Reservation service — business logic for class reservations and waitlist."""

from datetime import date as date_cls
from datetime import datetime, timedelta
from typing import Any

from aws_lambda_powertools import Logger

from src.models.common import MX_TZ, mexico_now, new_id
from src.models.reservation import (
    ReservationCreate,
    ReservationResponse,
    ReservationStatus,
    ReservationType,
)
from src.repositories.class_repository import ClassRepository
from src.repositories.membership_plan_repository import MembershipPlanRepository
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
        plan_repo: MembershipPlanRepository | None = None,
    ) -> None:
        self._reservation_repo = reservation_repo or ReservationRepository()
        self._class_repo = class_repo or ClassRepository()
        self._student_repo = student_repo or StudentRepository()
        self._membership_repo = membership_repo or MembershipRepository()
        self._plan_repo = plan_repo or MembershipPlanRepository()

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
        is_visitor = data.reservation_type in (ReservationType.DAY_PASS, ReservationType.COURTESY)

        # For visitors, generate a unique student_id so they don't collide.
        if is_visitor and (not data.student_id or data.student_id.startswith("visitor_")):
            data = data.model_copy(update={"student_id": f"visitor_{new_id()}"})

        logger.info(
            "Creating reservation",
            extra={
                "student_id": data.student_id,
                "class_id": data.class_id,
                "reservation_type": data.reservation_type,
            },
        )

        # Only validate student existence for member reservations.
        if not is_visitor:
            self._student_repo.get_by_id(data.student_id)

        class_item = self._class_repo.get_by_id(data.class_id)

        if class_item.is_cancelled:
            raise_bad_request(f"Class '{data.class_id}' has been cancelled.")

        if not staff_override and not is_visitor:
            self._check_booking_window(class_item)
            self._check_daily_limit(data.student_id, class_item.class_date)
            self._check_schedule_restrictions(data.student_id, class_item)

        # Reject if the student already holds a spot or a waitlist seat.
        existing = self._reservation_repo.get_reservation_or_waitlist(
            data.class_id, data.student_id
        )
        if existing is not None and existing.status in ("confirmed", "waitlisted"):
            raise_conflict(
                f"Student '{data.student_id}' already has a reservation "
                f"for class '{data.class_id}'."
            )
        # A cancelled/attended/no_show RESERVATION# blocks the conditional put — clear it.
        if existing is not None:
            self._reservation_repo.delete_stale_reservation(data.class_id, data.student_id)

        class_date = class_item.class_date

        # Atomically claim a spot: increments only if reservations_count < capacity.
        # This closes the read-then-write race between concurrent enrollments.
        claimed = self._class_repo.try_claim_spot(data.class_id)

        if claimed is not None:
            try:
                reservation = self._reservation_repo.create_reservation(data, class_date)
            except Exception:
                # Roll back the claimed spot if the item write failed.
                self._class_repo.decrement_reservations_count(data.class_id)
                raise
            self.sync_counts(data.class_id)
            logger.info(
                "Reservation confirmed", extra={"reservation_id": reservation.reservation_id}
            )
            return reservation.to_response()

        position = self._reservation_repo.get_next_waitlist_position(data.class_id)
        waitlist_item = self._reservation_repo.add_to_waitlist(data, class_date, position)
        self.sync_counts(data.class_id)
        logger.info("Added to waitlist", extra={"position": position})
        return waitlist_item.to_response()

    def cancel_reservation(
        self, class_id: str, student_id: str, *, staff_override: bool = False,
    ) -> tuple[ReservationResponse, str | None]:
        """Cancel a confirmed reservation or leave the waitlist.

        Rules:
        - Only ``confirmed`` reservations can be cancelled. Cancelling an
          already cancelled/attended/no_show record is rejected (would drift counters).
        - A ``waitlisted`` student is simply removed from the waitlist.
        - After a confirmed cancellation, the first waitlisted student is promoted.
        - Counters are recomputed from source of truth afterwards.

        Args:
            class_id: The class ID.
            student_id: The student's ID.
            staff_override: If True, skip the cancellation time window (front desk).

        Returns:
            Tuple of (cancelled reservation, promoted_student_id or None).
        """
        logger.info(
            "Cancelling reservation",
            extra={"student_id": student_id, "class_id": class_id},
        )

        existing = self._reservation_repo.get_reservation_or_waitlist(class_id, student_id)
        if existing is None:
            raise_bad_request(
                f"No reservation found for student '{student_id}' in class '{class_id}'."
            )

        class_item = self._class_repo.get_by_id(class_id)

        # Waitlist path: just remove the entry, no promotion needed.
        if existing.status == ReservationStatus.WAITLISTED.value:
            removed = self._reservation_repo.remove_from_waitlist_by_student(class_id, student_id)
            self.sync_counts(class_id)
            logger.info("Removed from waitlist", extra={"student_id": student_id})
            response = (removed or existing).to_response()
            response.status = ReservationStatus.CANCELLED
            return response, None

        if existing.status != ReservationStatus.CONFIRMED.value:
            raise_bad_request(
                f"No se puede cancelar una reservación con estado '{existing.status}'."
            )

        if not staff_override:
            self._check_cancel_window(class_item)

        cancelled = self._reservation_repo.cancel_reservation(class_id, student_id)

        promoted_student_id: str | None = None
        promoted = self._reservation_repo.promote_from_waitlist(class_id, class_item.class_date)
        if promoted:
            promoted_student_id = promoted.student_id
            logger.info(
                "Promoted from waitlist",
                extra={"promoted_student_id": promoted.student_id},
            )

        self.sync_counts(class_id)
        return cancelled.to_response(), promoted_student_id

    def sync_counts(self, class_id: str) -> tuple[int, int]:
        """Recompute and persist reservations_count / waitlist_count for a class.

        Source of truth is the set of RESERVATION# and WAITLIST# items, never the
        stored counters. Call after every mutation to prevent drift.
        """
        reservations, waitlist = self._reservation_repo.recount(class_id)
        self._class_repo.set_counts(class_id, reservations, waitlist)
        return reservations, waitlist

    def admin_update_status(
        self,
        class_id: str,
        student_id: str,
        new_status: ReservationStatus,
        *,
        confirm: bool = False,
    ) -> ReservationResponse:
        """Admin override of a reservation status with counter re-sync.

        Rules:
        - ``waitlisted`` is not a valid target on a RESERVATION# item.
        - Leaving a terminal state (attended / no_show) requires ``confirm=True``.
        - Moving into ``confirmed`` when the class is full is rejected.
        """
        if new_status == ReservationStatus.WAITLISTED:
            raise_bad_request(
                "No se puede asignar 'waitlisted' manualmente. "
                "Cancela la reservación y vuelve a inscribir al alumno."
            )

        existing = self._reservation_repo.get_reservation(class_id, student_id)
        if existing is None:
            raise_bad_request(
                f"No reservation found for student '{student_id}' in class '{class_id}'."
            )

        if existing.status == new_status.value:
            return existing.to_response()

        terminal = {ReservationStatus.ATTENDED.value, ReservationStatus.NO_SHOW.value}
        if existing.status in terminal and not confirm:
            raise_conflict(
                f"Cambiar de '{existing.status}' a '{new_status.value}' es una "
                "operación de alto riesgo. Envía confirm=true para continuar."
            )

        # Re-activating a spot: make sure there is capacity.
        counted = {
            ReservationStatus.CONFIRMED.value,
            ReservationStatus.ATTENDED.value,
            ReservationStatus.NO_SHOW.value,
        }
        if existing.status not in counted and new_status.value in counted:
            class_item = self._class_repo.get_by_id(class_id)
            reservations, _ = self._reservation_repo.recount(class_id)
            if reservations >= class_item.capacity:
                raise_bad_request(
                    f"La clase está llena ({reservations}/{class_item.capacity}). "
                    "No se puede reactivar esta reservación."
                )

        updated = self._reservation_repo.admin_update_status(class_id, student_id, new_status)
        self.sync_counts(class_id)
        return updated.to_response()

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
        self.sync_counts(class_id)

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
    # Daily limit — dynamic from plan or fallback set
    # ------------------------------------------------------------------

    # Fallback for memberships created before plans existed in DynamoDB.
    _FALLBACK_ONE_SESSION = {"founder", "room_daily", "room_pass", "founder_monthly", "room_duo", "kilo_a_kilo"}

    def _get_sessions_per_day(self, membership_type: str) -> int:
        """Look up sessions_per_day from the plan, falling back to hardcoded set."""
        plan = self._plan_repo.get_by_slug_or_none(membership_type)
        if plan is not None:
            return plan.sessions_per_day
        # Fallback: 1 if in legacy set, else 0 (unlimited)
        return 1 if membership_type in self._FALLBACK_ONE_SESSION else 0

    def _check_daily_limit(self, student_id: str, class_date: str) -> None:
        """Raise 400 if a student has reached their daily session limit."""
        active = self._membership_repo.get_active_for_student(student_id)
        if active is None:
            return

        sessions_per_day = self._get_sessions_per_day(active.membership_type)
        if sessions_per_day == 0:
            return  # unlimited

        records = self._reservation_repo.list_all_for_student(student_id, limit=200)
        # Include "attended" so a member who already checked in today
        # cannot reserve a second class the same day; waitlist seats count too.
        same_day_active = [
            r for r in records
            if r.class_date == class_date
            and r.status in ("confirmed", "attended", "waitlisted")
        ]
        if len(same_day_active) >= sessions_per_day:
            raise_bad_request(
                f"Tu membresía solo permite {sessions_per_day} clase(s) por día. "
                "Ya tienes una reservación para esta fecha."
            )

    # ------------------------------------------------------------------
    # Schedule restrictions — allowed_days + blocked_schedules
    # ------------------------------------------------------------------

    _DAY_INDEX_TO_ABBR = {
        0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun",
    }

    def _check_schedule_restrictions(self, student_id: str, class_item: Any) -> None:
        """Raise 400 if the student's plan blocks this class day/time."""
        active = self._membership_repo.get_active_for_student(student_id)
        if active is None:
            return

        plan = self._plan_repo.get_by_slug_or_none(active.membership_type)
        if plan is None:
            return  # no plan config → no restrictions

        # Check allowed_days
        class_date = date_cls.fromisoformat(str(class_item.class_date))
        day_abbr = self._DAY_INDEX_TO_ABBR[class_date.weekday()]
        day_names = {
            "mon": "Lunes", "tue": "Martes", "wed": "Miércoles",
            "thu": "Jueves", "fri": "Viernes", "sat": "Sábado", "sun": "Domingo",
        }

        if day_abbr not in plan.allowed_days:
            raise_bad_request(
                f"Tu membresía ({plan.label}) no permite reservar los "
                f"{day_names.get(day_abbr, day_abbr)}."
            )

        # Check blocked_schedules
        if not plan.blocked_schedules:
            return

        class_time = str(class_item.start_time)[:5]  # "HH:MM"
        for bs in plan.blocked_schedules:
            if bs.get("day") == day_abbr:
                bs_start = bs.get("start", "00:00")
                bs_end = bs.get("end", "23:59")
                if bs_start <= class_time < bs_end:
                    raise_bad_request(
                        f"Tu membresía ({plan.label}) tiene bloqueado el horario "
                        f"{bs_start}–{bs_end} los {day_names.get(day_abbr, day_abbr)}."
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
