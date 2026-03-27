"""Membership service — business logic for membership management."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.membership import (
    MembershipCreate,
    MembershipResponse,
    MembershipStatus,
    MembershipUpdate,
)
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository
from src.utils.exceptions import raise_bad_request

logger = Logger()


class MembershipService:
    """Service for membership business logic operations."""

    def __init__(
        self,
        membership_repo: MembershipRepository | None = None,
        student_repo: StudentRepository | None = None,
    ) -> None:
        self._membership_repo = membership_repo or MembershipRepository()
        self._student_repo = student_repo or StudentRepository()

    def assign_membership(self, data: MembershipCreate) -> MembershipResponse:
        """Assign a new membership to a student.

        Validates:
        - Student exists
        - Student does not already have an active membership

        Args:
            data: Validated membership creation payload.

        Returns:
            The created membership response.
        """
        logger.info("Assigning membership", extra={"student_id": data.student_id})

        self._student_repo.get_by_id(data.student_id)

        existing_active = self._membership_repo.get_active_for_student(data.student_id)
        if existing_active:
            raise_bad_request(
                f"Student '{data.student_id}' already has an active membership "
                f"(id: {existing_active.membership_id}). Cancel or expire it first."
            )

        item = self._membership_repo.create(data)
        logger.info("Membership assigned", extra={"membership_id": item.membership_id})
        return item.to_response()

    def get_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Get a specific membership by student and membership ID."""
        item = self._membership_repo.get_by_id(student_id, membership_id)
        return item.to_response()

    def get_active_membership(self, student_id: str) -> MembershipResponse | None:
        """Get the active membership for a student, or None if none exists."""
        self._student_repo.get_by_id(student_id)
        item = self._membership_repo.get_active_for_student(student_id)
        return item.to_response() if item else None

    def list_memberships_for_student(
        self,
        student_id: str,
        limit: int = 20,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipResponse], dict[str, Any] | None]:
        """List all memberships (active + historical) for a student."""
        self._student_repo.get_by_id(student_id)
        items, next_key = self._membership_repo.list_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def update_membership(
        self,
        student_id: str,
        membership_id: str,
        data: MembershipUpdate,
    ) -> MembershipResponse:
        """Update membership details (e.g., extend expiry, cancel).

        Args:
            student_id: The student's ID.
            membership_id: The membership's ID.
            data: Partial update payload.

        Returns:
            The updated membership response.
        """
        logger.info("Updating membership", extra={"membership_id": membership_id})
        item = self._membership_repo.update(student_id, membership_id, data)
        return item.to_response()

    def cancel_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Cancel an active membership."""
        logger.info("Cancelling membership", extra={"membership_id": membership_id})
        return self.update_membership(
            student_id, membership_id, MembershipUpdate(status=MembershipStatus.CANCELLED)
        )

    def list_expiring_soon(
        self, days: int = 7
    ) -> tuple[list[MembershipResponse], dict[str, Any] | None]:
        """List memberships expiring within the next N days (for renewal alerts)."""
        items, next_key = self._membership_repo.list_expiring_soon(days=days)
        return [i.to_response() for i in items], next_key
