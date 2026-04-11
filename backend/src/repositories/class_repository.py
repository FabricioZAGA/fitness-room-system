"""Class repository — DynamoDB access patterns for Class sessions."""

from typing import Any

from src.models.class_model import ClassCreate, ClassDynamoItem, ClassUpdate
from src.models.common import utc_now
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class ClassRepository(DynamoRepository):
    """Repository for class session entity access patterns."""

    def create(self, data: ClassCreate) -> ClassDynamoItem:
        """Create a new class session.

        Access pattern: PUT PK=CLASS#id, SK=PROFILE.
        """
        item = ClassDynamoItem.from_create(data)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_by_id(self, class_id: str) -> ClassDynamoItem:
        """Get a class session by ID.

        Access pattern: GET PK=CLASS#id, SK=PROFILE.
        """
        raw = self.get_item(f"CLASS#{class_id}", "PROFILE")
        if raw is None:
            raise ResourceNotFoundException(f"Class '{class_id}' not found")
        return ClassDynamoItem.model_validate(raw)

    def list_all(
        self,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
        scan_index_forward: bool = True,
    ) -> tuple[list[ClassDynamoItem], dict[str, Any] | None]:
        """List all class sessions ordered by date.

        Access pattern: GSI1 PK=CLASSES, SK begins_with DATE#.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="CLASSES",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
            scan_index_forward=scan_index_forward,
        )
        return [ClassDynamoItem.model_validate(i) for i in items], next_key

    def list_by_date(
        self,
        class_date: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ClassDynamoItem], dict[str, Any] | None]:
        """List all classes for a specific date.

        Access pattern: GSI1 PK=CLASSES, SK begins_with DATE#{date}#CLASS#.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="CLASSES",
            sk_name="GSI1SK",
            sk_begins_with=f"DATE#{class_date}#CLASS#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [ClassDynamoItem.model_validate(i) for i in items], next_key

    def list_by_date_range(
        self,
        start_date: str,
        end_date: str,
        limit: int = 100,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ClassDynamoItem], dict[str, Any] | None]:
        """List all classes within a date range.

        Access pattern: GSI1 PK=CLASSES, SK between DATE#{start} and DATE#{end}.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="CLASSES",
            sk_name="GSI1SK",
            sk_begins_with=f"DATE#{start_date}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        filtered = [
            ClassDynamoItem.model_validate(i) for i in items if i.get("class_date", "") <= end_date
        ]
        return filtered, next_key

    def update(self, class_id: str, data: ClassUpdate) -> ClassDynamoItem:
        """Update a class session's attributes.

        Access pattern: UPDATE PK=CLASS#id, SK=PROFILE.
        """
        updates: dict[str, Any] = {"updated_at": utc_now().isoformat()}

        if data.instructor_name is not None:
            updates["instructor_name"] = data.instructor_name
        if data.class_date is not None:
            date_str = data.class_date.isoformat()
            updates["class_date"] = date_str
        if data.start_time is not None:
            updates["start_time"] = data.start_time.isoformat()
        if data.duration_minutes is not None:
            updates["duration_minutes"] = data.duration_minutes
        if data.capacity is not None:
            updates["capacity"] = data.capacity
        if data.location is not None:
            updates["location"] = data.location
        if data.description is not None:
            updates["description"] = data.description
        if data.class_link is not None:
            updates["class_link"] = data.class_link
        if data.is_cancelled is not None:
            updates["is_cancelled"] = data.is_cancelled

        raw = self.update_item(f"CLASS#{class_id}", "PROFILE", updates)
        return ClassDynamoItem.model_validate(raw)

    def increment_reservations_count(self, class_id: str) -> int:
        """Atomically increment the reservation counter.

        Returns the new reservations count.
        """
        return self.update_counter(
            pk=f"CLASS#{class_id}",
            sk="PROFILE",
            attribute="reservations_count",
            delta=1,
        )

    def decrement_reservations_count(self, class_id: str) -> int:
        """Atomically decrement the reservation counter."""
        return self.update_counter(
            pk=f"CLASS#{class_id}",
            sk="PROFILE",
            attribute="reservations_count",
            delta=-1,
        )

    def increment_waitlist_count(self, class_id: str) -> int:
        """Atomically increment the waitlist counter."""
        return self.update_counter(
            pk=f"CLASS#{class_id}",
            sk="PROFILE",
            attribute="waitlist_count",
            delta=1,
        )

    def decrement_waitlist_count(self, class_id: str) -> int:
        """Atomically decrement the waitlist counter."""
        return self.update_counter(
            pk=f"CLASS#{class_id}",
            sk="PROFILE",
            attribute="waitlist_count",
            delta=-1,
        )

    def list_for_instructor(
        self,
        instructor_name_slug: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ClassDynamoItem], dict[str, Any] | None]:
        """List all classes assigned to an instructor.

        Access pattern: GSI2 PK=INSTRUCTOR#{name_slug}, ordered by date descending.
        The slug is built as: full_name.lower().replace(' ', '_').
        """
        items, next_key = self.query_gsi(
            index_name="GSI2",
            pk_name="GSI2PK",
            pk_value=f"INSTRUCTOR#{instructor_name_slug}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
            scan_index_forward=False,
        )
        return [ClassDynamoItem.model_validate(i) for i in items], next_key

    def delete(self, class_id: str) -> None:
        """Delete (cancel) a class session.

        Access pattern: DELETE PK=CLASS#id, SK=PROFILE.
        """
        self.delete_item(f"CLASS#{class_id}", "PROFILE")
