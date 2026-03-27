"""Reservation service — business logic for class reservations and waitlist."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.reservation import ReservationCreate, ReservationResponse
from src.repositories.class_repository import ClassRepository
from src.repositories.membership_repository import MembershipRepository
from src.repositories.reservation_repository import ReservationRepository
from src.repositories.student_repository import StudentRepository
from src.utils.exceptions import (
    raise_bad_request,
    raise_conflict,
)

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

    def create_reservation(self, data: ReservationCreate) -> ReservationResponse:
        """Reserve a spot in a class for a student.

        Business rules:
        1. Student must exist
        2. Class must exist and not be cancelled
        3. Student must NOT already have a reservation
        4. If capacity is available → create confirmed reservation
        5. If class is full → add to waitlist automatically

        Args:
            data: Reservation creation payload.

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

        existing = self._reservation_repo.get_reservation(data.class_id, data.student_id)
        if existing:
            raise_conflict(
                f"Student '{data.student_id}' already has a reservation "
                f"for class '{data.class_id}'."
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

    def cancel_reservation(self, class_id: str, student_id: str) -> ReservationResponse:
        """Cancel a confirmed reservation and promote first waitlisted student.

        Args:
            class_id: The class ID.
            student_id: The student's ID.

        Returns:
            The cancelled reservation.
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

        cancelled = self._reservation_repo.cancel_reservation(class_id, student_id)
        self._class_repo.decrement_reservations_count(class_id)

        class_item = self._class_repo.get_by_id(class_id)
        promoted = self._reservation_repo.promote_from_waitlist(class_id, class_item.class_date)
        if promoted:
            self._class_repo.increment_reservations_count(class_id)
            self._class_repo.decrement_waitlist_count(class_id)
            logger.info(
                "Promoted from waitlist",
                extra={"promoted_student_id": promoted.student_id},
            )

        return cancelled.to_response()

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
        item = self._reservation_repo.mark_attendance(class_id, student_id, attended)
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
