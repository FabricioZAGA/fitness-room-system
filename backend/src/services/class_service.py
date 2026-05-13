"""Class service — business logic for fitness class session management."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.class_model import ClassCreate, ClassResponse, ClassUpdate
from src.repositories.class_repository import ClassRepository
from src.utils.exceptions import raise_bad_request

logger = Logger()


class ClassService:
    """Service for class session business logic operations."""

    def __init__(self, repository: ClassRepository | None = None) -> None:
        self._repo = repository or ClassRepository()

    def create_class(self, data: ClassCreate) -> ClassResponse:
        """Create a new class session.

        Args:
            data: Validated class creation payload.

        Returns:
            The created class response.
        """
        logger.info(
            "Creating class",
            extra={"class_type": data.class_type, "class_date": str(data.class_date)},
        )
        item = self._repo.create(data)
        logger.info("Class created", extra={"class_id": item.class_id})
        return item.to_response()

    def get_class(self, class_id: str) -> ClassResponse:
        """Get a class session by ID.

        Args:
            class_id: The class unique identifier.

        Returns:
            The class response.

        Raises:
            HTTP 404 if class is not found.
        """
        item = self._repo.get_by_id(class_id)
        return item.to_response()

    def list_classes(
        self,
        date_filter: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
        upcoming_only: bool = False,
    ) -> tuple[list[ClassResponse], dict[str, Any] | None]:
        """List class sessions with optional date filters.

        Args:
            date_filter: Filter to a specific date (ISO format YYYY-MM-DD).
            start_date: Range start date (ISO format).
            end_date: Range end date (ISO format).
            limit: Maximum number of results.
            last_evaluated_key: Pagination token.
            upcoming_only: If True, only return future classes.

        Returns:
            Tuple of (class list, next page token).
        """
        if date_filter:
            items, next_key = self._repo.list_by_date(
                date_filter, limit=limit, last_evaluated_key=last_evaluated_key
            )
        elif start_date and end_date:
            if start_date > end_date:
                raise_bad_request("start_date must be before or equal to end_date")
            items, next_key = self._repo.list_by_date_range(
                start_date, end_date, limit=limit, last_evaluated_key=last_evaluated_key
            )
        else:
            items, next_key = self._repo.list_all(
                limit=limit, last_evaluated_key=last_evaluated_key
            )

        responses = [i.to_response() for i in items]

        if upcoming_only:
            from src.models.common import mexico_today

            today = mexico_today().isoformat()
            responses = [r for r in responses if str(r.class_date) >= today]

        return responses, next_key

    def update_class(self, class_id: str, data: ClassUpdate) -> ClassResponse:
        """Update a class session's attributes.

        Args:
            class_id: The class unique identifier.
            data: Partial update payload.

        Returns:
            The updated class response.

        Raises:
            HTTP 404 if class is not found.
        """
        logger.info("Updating class", extra={"class_id": class_id})
        item = self._repo.update(class_id, data)
        return item.to_response()

    def cancel_class(self, class_id: str) -> ClassResponse:
        """Mark a class session as cancelled.

        Also cancels all confirmed reservations and removes all waitlist entries
        so DynamoDB stays consistent.
        """
        logger.info("Cancelling class", extra={"class_id": class_id})

        # Cancel all confirmed reservations
        from src.repositories.reservation_repository import ReservationRepository
        res_repo = ReservationRepository()
        reservations, _ = res_repo.list_for_class(class_id, limit=500)
        for r in reservations:
            if r.status in ("confirmed", "waitlisted"):
                try:
                    res_repo.cancel_reservation(class_id, r.student_id)
                except Exception:
                    logger.warning(
                        "Failed to cancel reservation during class cancel",
                        extra={"class_id": class_id, "student_id": r.student_id},
                    )

        # Remove waitlist entries
        waitlist, _ = res_repo.get_waitlist_for_class(class_id, limit=500)
        for w in waitlist:
            try:
                res_repo.remove_from_waitlist(class_id, w.student_id, w.position)
            except Exception:
                logger.warning(
                    "Failed to remove waitlist entry during class cancel",
                    extra={"class_id": class_id, "student_id": w.student_id},
                )

        item = self._repo.update(class_id, ClassUpdate(is_cancelled=True))
        return item.to_response()

    def delete_class(self, class_id: str) -> None:
        """Permanently delete a class session.

        Only use for administrative cleanup. Prefer cancel_class for normal flow.
        """
        logger.info("Deleting class", extra={"class_id": class_id})
        self._repo.delete(class_id)
