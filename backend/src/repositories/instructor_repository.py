"""Repository for Instructor DynamoDB operations."""

from typing import Any

from src.models.instructor import (
    InstructorCreate,
    InstructorDynamoItem,
    InstructorStatus,
    InstructorUpdate,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class InstructorRepository(DynamoRepository):
    """Data access layer for instructors."""

    def create(self, data: InstructorCreate) -> InstructorDynamoItem:
        """Create a new instructor."""
        item = InstructorDynamoItem.from_create(data)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_by_id(self, instructor_id: str) -> InstructorDynamoItem:
        """Get an instructor by ID."""
        pk = f"INSTRUCTOR#{instructor_id}"
        result = self.get_item(pk, pk)
        if not result:
            raise ResourceNotFoundException(f"Instructor '{instructor_id}' not found")
        return InstructorDynamoItem(**result)

    def list_all(
        self,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[InstructorDynamoItem], dict[str, Any] | None]:
        """List all instructors ordered by name."""
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="INSTRUCTOR",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [InstructorDynamoItem(**item) for item in items], next_key

    def list_by_status(
        self,
        status: InstructorStatus,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[InstructorDynamoItem], dict[str, Any] | None]:
        """List instructors by status."""
        items, next_key = self.query_gsi(
            index_name="GSI2",
            pk_name="GSI2PK",
            pk_value=f"INSTRUCTOR#{status}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [InstructorDynamoItem(**item) for item in items], next_key

    def update(
        self, instructor_id: str, data: InstructorUpdate
    ) -> InstructorDynamoItem:
        """Update an instructor's profile."""
        existing = self.get_by_id(instructor_id)

        updates: dict[str, Any] = {}
        if data.first_name is not None:
            updates["first_name"] = data.first_name
        if data.last_name is not None:
            updates["last_name"] = data.last_name
        if data.email is not None:
            updates["email"] = data.email
        if data.phone is not None:
            updates["phone"] = data.phone
        if data.status is not None:
            updates["status"] = data.status
            updates["GSI2PK"] = f"INSTRUCTOR#{data.status}"
        if data.specialties is not None:
            updates["specialties"] = data.specialties
        if data.bio is not None:
            updates["bio"] = data.bio
        if data.photo_url is not None:
            updates["photo_url"] = data.photo_url
        if data.hourly_rate is not None:
            updates["hourly_rate"] = data.hourly_rate

        if not updates:
            return existing

        # Update name sort keys if name changed
        first = updates.get("first_name", existing.first_name)
        last = updates.get("last_name", existing.last_name)
        full_name = f"{last}, {first}".upper()
        updates["GSI1SK"] = full_name
        updates["GSI2SK"] = full_name

        updated = self.update_item(existing.PK, existing.SK, updates)
        return InstructorDynamoItem(**updated)

    def delete(self, instructor_id: str) -> None:
        """Delete an instructor."""
        existing = self.get_by_id(instructor_id)
        self.delete_item(existing.PK, existing.SK)
