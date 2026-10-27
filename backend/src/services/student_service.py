"""Student service — business logic for student management.

Business rules for status transitions (v3.0.0 — memberships are never cancelled):
- deactivate: student → inactive,  active membership → frozen (indefinitely)
- suspend:    student → suspended, active membership → frozen (indefinitely)
- unsuspend:  student → active,    frozen membership → unfrozen
- activate:   student → active,    frozen membership → unfrozen
Unfreezing credits exactly the days the membership was frozen.
"""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.membership import MembershipDynamoItem
from src.models.student import StudentCreate, StudentResponse, StudentStatus, StudentUpdate
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository
from src.services.membership_service import MembershipService
from src.services.uniqueness_service import UniquenessService
from src.utils.exceptions import ResourceAlreadyExistsException, raise_bad_request, raise_conflict

logger = Logger()


class StudentService:
    """Service for student business logic operations."""

    def __init__(
        self,
        repository: StudentRepository | None = None,
        membership_repo: MembershipRepository | None = None,
        membership_service: MembershipService | None = None,
    ) -> None:
        self._repo = repository or StudentRepository()
        self._membership_repo = membership_repo or MembershipRepository()
        self._memberships = membership_service or MembershipService(
            membership_repo=self._membership_repo, student_repo=self._repo
        )
        self._uniqueness = UniquenessService(
            student_repo=self._repo,
        )

    def create_student(self, data: StudentCreate) -> StudentResponse:
        """Create a new student, ensuring email/phone uniqueness across entities.

        Args:
            data: Validated student creation payload.

        Returns:
            The created student response.

        Raises:
            HTTP 409 if the email or phone is already registered.
        """
        logger.info("Creating student", extra={"email": data.email})

        self._uniqueness.validate_create_student(data.email, data.phone)

        try:
            item = self._repo.create(data)
        except ResourceAlreadyExistsException as e:
            raise_conflict(str(e.message))

        logger.info("Student created", extra={"student_id": item.student_id})
        return item.to_response()

    def get_student(self, student_id: str) -> StudentResponse:
        """Get a student by ID.

        Args:
            student_id: The student's unique identifier.

        Returns:
            The student response.

        Raises:
            HTTP 404 if student is not found.
        """
        item = self._repo.get_by_id(student_id)
        return item.to_response()

    def list_students(
        self,
        status: StudentStatus | None = None,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[StudentResponse], dict[str, Any] | None]:
        """List all students with optional status filter.

        Args:
            status: Optional status filter (active, inactive, suspended).
            limit: Maximum number of students to return.
            last_evaluated_key: Pagination token.

        Returns:
            Tuple of (student list, next page token).
        """
        items, next_key = self._repo.list_all(
            limit=limit,
            last_evaluated_key=last_evaluated_key,
            status=status,
        )
        return [i.to_response() for i in items], next_key

    def update_student(self, student_id: str, data: StudentUpdate) -> StudentResponse:
        """Update a student's profile.

        Args:
            student_id: The student's unique identifier.
            data: Partial update payload.

        Returns:
            The updated student response.

        Raises:
            HTTP 404 if student is not found.
            HTTP 409 if the new email or phone is already taken.
        """
        logger.info("Updating student", extra={"student_id": student_id})

        self._uniqueness.validate_update_student(
            student_id, data.email, data.phone
        )

        item = self._repo.update(student_id, data)
        return item.to_response()

    def delete_student(self, student_id: str) -> None:
        """Delete a student by ID.

        Note: This does NOT cascade-delete memberships or reservations.
        Ensure those are handled via separate cleanup or soft-delete.

        Args:
            student_id: The student's unique identifier.

        Raises:
            HTTP 404 if student is not found.
        """
        logger.info("Deleting student", extra={"student_id": student_id})
        self._repo.delete(student_id)

    def activate_student(self, student_id: str) -> StudentResponse:
        """Set a student's status to active (from inactive or suspended).

        Cascade: frozen membership → unfrozen (crediting the days frozen).
        """
        student = self._repo.get_by_id(student_id)
        if student.status == StudentStatus.ACTIVE.value:
            raise_bad_request("El miembro ya está activo.")
        logger.info("Activating student", extra={"student_id": student_id})
        self._unfreeze_current(student_id, reason="activate")
        return self.update_student(
            student_id, StudentUpdate(status=StudentStatus.ACTIVE)
        )

    def deactivate_student(self, student_id: str) -> StudentResponse:
        """Set a student's status to inactive.

        Cascade: active membership → frozen indefinitely (memberships are not
        refunded, so they are never cancelled). Queued renewals stay queued.
        """
        student = self._repo.get_by_id(student_id)
        if student.status == StudentStatus.INACTIVE.value:
            raise_bad_request("El miembro ya está inactivo.")

        logger.info("Deactivating student", extra={"student_id": student_id})
        self._freeze_current(student_id, reason="deactivate")
        return self.update_student(
            student_id, StudentUpdate(status=StudentStatus.INACTIVE)
        )

    def suspend_student(self, student_id: str) -> StudentResponse:
        """Temporarily suspend a student.

        Cascade: active membership → frozen indefinitely.
        """
        student = self._repo.get_by_id(student_id)
        if student.status == StudentStatus.SUSPENDED.value:
            raise_bad_request("El miembro ya está suspendido.")
        if student.status == StudentStatus.INACTIVE.value:
            raise_bad_request(
                "No se puede suspender un miembro inactivo. Actívalo primero."
            )

        logger.info("Suspending student", extra={"student_id": student_id})
        self._freeze_current(student_id, reason="suspend")
        return self.update_student(
            student_id, StudentUpdate(status=StudentStatus.SUSPENDED)
        )

    def unsuspend_student(self, student_id: str) -> StudentResponse:
        """Reactivate a suspended student.

        Cascade: frozen membership → unfrozen automatically.
        """
        student = self._repo.get_by_id(student_id)
        if student.status != StudentStatus.SUSPENDED.value:
            raise_bad_request(
                "Solo se puede reactivar un miembro suspendido."
            )

        logger.info("Unsuspending student", extra={"student_id": student_id})
        self._unfreeze_current(student_id, reason="unsuspend")
        return self.update_student(
            student_id, StudentUpdate(status=StudentStatus.ACTIVE)
        )

    def _freeze_current(self, student_id: str, reason: str) -> MembershipDynamoItem | None:
        """Freeze the student's active membership indefinitely, if any."""
        self._memberships.roll_student(student_id)
        active_m = self._membership_repo.get_active_for_student(student_id)
        if not active_m:
            return None
        logger.info(
            "Freezing active membership",
            extra={"membership_id": active_m.membership_id, "reason": reason},
        )
        return self._memberships.freeze_item(student_id, active_m.membership_id, days=None)

    def _unfreeze_current(self, student_id: str, reason: str) -> MembershipDynamoItem | None:
        """Unfreeze the student's frozen membership, if any."""
        frozen_m = self._memberships.get_frozen_membership(student_id)
        if not frozen_m:
            return None
        logger.info(
            "Unfreezing membership",
            extra={"membership_id": frozen_m.membership_id, "reason": reason},
        )
        return self._memberships.unfreeze_item(student_id, frozen_m.membership_id)
