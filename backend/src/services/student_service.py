"""Student service — business logic for student management."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.student import StudentCreate, StudentResponse, StudentStatus, StudentUpdate
from src.repositories.student_repository import StudentRepository
from src.utils.exceptions import ResourceAlreadyExistsException, raise_bad_request, raise_conflict

logger = Logger()


class StudentService:
    """Service for student business logic operations."""

    def __init__(self, repository: StudentRepository | None = None) -> None:
        self._repo = repository or StudentRepository()

    def create_student(self, data: StudentCreate) -> StudentResponse:
        """Create a new student, ensuring email uniqueness.

        Args:
            data: Validated student creation payload.

        Returns:
            The created student response.

        Raises:
            HTTP 409 if the email is already registered.
        """
        logger.info("Creating student", extra={"email": data.email})
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
            status: Optional status filter (active, inactive, founder, new).
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
        """
        logger.info("Updating student", extra={"student_id": student_id})
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
        """Set a student's status to active."""
        return self.update_student(student_id, StudentUpdate(status=StudentStatus.ACTIVE))

    def deactivate_student(self, student_id: str) -> StudentResponse:
        """Set a student's status to inactive."""
        return self.update_student(student_id, StudentUpdate(status=StudentStatus.INACTIVE))
