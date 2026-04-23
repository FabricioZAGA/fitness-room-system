"""Business logic for instructor management."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.instructor import (
    InstructorCreate,
    InstructorResponse,
    InstructorStatus,
    InstructorUpdate,
)
from src.repositories.instructor_repository import InstructorRepository
from src.services.uniqueness_service import UniquenessService

logger = Logger(child=True)


class InstructorService:
    """Service layer for instructor operations."""

    def __init__(self) -> None:
        self._repo = InstructorRepository()
        self._uniqueness = UniquenessService(
            instructor_repo=self._repo,
        )

    def create_instructor(self, data: InstructorCreate) -> InstructorResponse:
        """Create a new instructor, ensuring email/phone uniqueness across entities.

        Raises:
            HTTP 409 if the email or phone is already registered.
        """
        self._uniqueness.validate_create_instructor(data.email, data.phone)

        item = self._repo.create(data)
        logger.info("Instructor created", extra={"instructor_id": item.instructor_id})
        return item.to_response()

    def get_instructor(self, instructor_id: str) -> InstructorResponse:
        """Get an instructor by ID."""
        item = self._repo.get_by_id(instructor_id)
        return item.to_response()

    def list_instructors(
        self,
        status: InstructorStatus | None = None,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[InstructorResponse], dict[str, Any] | None]:
        """List instructors, optionally filtered by status."""
        if status:
            items, next_key = self._repo.list_by_status(
                status, limit=limit, last_evaluated_key=last_evaluated_key
            )
        else:
            items, next_key = self._repo.list_all(
                limit=limit, last_evaluated_key=last_evaluated_key
            )
        return [item.to_response() for item in items], next_key

    def update_instructor(
        self, instructor_id: str, data: InstructorUpdate
    ) -> InstructorResponse:
        """Update an instructor's profile.

        Raises:
            HTTP 409 if the new email or phone is already taken.
        """
        self._uniqueness.validate_update_instructor(
            instructor_id, data.email, data.phone
        )

        item = self._repo.update(instructor_id, data)
        logger.info("Instructor updated", extra={"instructor_id": instructor_id})
        return item.to_response()

    def deactivate_instructor(self, instructor_id: str) -> InstructorResponse:
        """Mark an instructor as inactive."""
        update = InstructorUpdate(status=InstructorStatus.INACTIVE)
        return self.update_instructor(instructor_id, update)

    def activate_instructor(self, instructor_id: str) -> InstructorResponse:
        """Reactivate an instructor."""
        update = InstructorUpdate(status=InstructorStatus.ACTIVE)
        return self.update_instructor(instructor_id, update)

    def delete_instructor(self, instructor_id: str) -> None:
        """Delete an instructor permanently."""
        self._repo.delete(instructor_id)
        logger.info("Instructor deleted", extra={"instructor_id": instructor_id})
