"""Membership repository — DynamoDB access patterns for Memberships."""

from datetime import date, timedelta
from typing import Any

from src.models.common import mexico_today, utc_now
from src.models.membership import (
    MembershipCreate,
    MembershipDynamoItem,
    MembershipStatus,
    MembershipUpdate,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class MembershipRepository(DynamoRepository):
    """Repository for membership entity access patterns."""

    def create(self, data: MembershipCreate) -> MembershipDynamoItem:
        """Create a new membership for a student.

        Access pattern: PUT PK=STUDENT#id, SK=MEMBERSHIP#id.
        Also deactivates any previous active membership via GSI3.
        """
        item = MembershipDynamoItem.from_create(data)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_by_id(self, student_id: str, membership_id: str) -> MembershipDynamoItem:
        """Get a specific membership by student and membership ID.

        Access pattern: GET PK=STUDENT#id, SK=MEMBERSHIP#membership_id.
        """
        raw = self.get_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}")
        if raw is None:
            raise ResourceNotFoundException(
                f"Membership '{membership_id}' for student '{student_id}' not found"
            )
        return MembershipDynamoItem.model_validate(raw)

    def list_for_student(
        self,
        student_id: str,
        limit: int = 20,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipDynamoItem], dict[str, Any] | None]:
        """List all memberships for a student.

        Access pattern: QUERY PK=STUDENT#id, SK begins_with MEMBERSHIP#.
        """
        items, next_key = self.query_by_pk(
            pk=f"STUDENT#{student_id}",
            sk_begins_with="MEMBERSHIP#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [MembershipDynamoItem.model_validate(i) for i in items], next_key

    def get_active_for_student(self, student_id: str) -> MembershipDynamoItem | None:
        """Get the current active membership for a student.

        Access pattern: GSI3 PK=STUDENT#id, SK=ACTIVE_MEMBERSHIP.
        Returns None if the student has no active membership.
        """
        items, _ = self.query_gsi(
            index_name="GSI3",
            pk_name="GSI3PK",
            pk_value=f"STUDENT#{student_id}",
            sk_name="GSI3SK",
            sk_begins_with="ACTIVE_MEMBERSHIP",
            limit=1,
        )
        if not items:
            return None
        return MembershipDynamoItem.model_validate(items[0])

    def list_expiring_soon(
        self,
        days: int = 7,
        limit: int = 100,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipDynamoItem], dict[str, Any] | None]:
        """List memberships expiring within the next N days.

        Access pattern: GSI1 PK=MEMBERSHIPS, SK between today and today+N.
        Used for renewal alerts.
        """
        today = mexico_today()
        target_date = date.fromordinal(today.toordinal() + days)
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="MEMBERSHIPS",
            sk_name="GSI1SK",
            sk_begins_with=f"EXPIRY#{today.isoformat()}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        filtered = [
            MembershipDynamoItem.model_validate(i)
            for i in items
            if i.get("end_date", "") <= target_date.isoformat()
            and i.get("status") == MembershipStatus.ACTIVE.value
        ]
        return filtered, next_key

    def update(
        self,
        student_id: str,
        membership_id: str,
        data: MembershipUpdate,
    ) -> MembershipDynamoItem:
        """Update an existing membership's attributes.

        Access pattern: UPDATE PK=STUDENT#id, SK=MEMBERSHIP#id.
        """
        updates: dict[str, Any] = {"updated_at": utc_now().isoformat()}

        if data.end_date is not None:
            updates["end_date"] = data.end_date.isoformat()
            updates["GSI1SK"] = f"EXPIRY#{data.end_date.isoformat()}#STUDENT#{student_id}"
        if data.status is not None:
            updates["status"] = data.status.value
            if data.status != MembershipStatus.ACTIVE:
                updates["GSI3SK"] = f"INACTIVE_MEMBERSHIP#{membership_id}"
        if data.price_paid is not None:
            updates["price_paid"] = str(data.price_paid)
        if data.classes_remaining is not None:
            updates["classes_remaining"] = data.classes_remaining
        if data.notes is not None:
            updates["notes"] = data.notes

        raw = self.update_item(
            f"STUDENT#{student_id}",
            f"MEMBERSHIP#{membership_id}",
            updates,
        )
        return MembershipDynamoItem.model_validate(raw)

    def freeze(self, student_id: str, membership_id: str, days: int) -> MembershipDynamoItem:
        """Freeze a membership for N days, extending end_date accordingly."""
        item = self.get_by_id(student_id, membership_id)
        today = mexico_today()
        freeze_end = today + timedelta(days=days)
        new_end = date.fromisoformat(item.end_date) + timedelta(days=days)
        accumulated = item.frozen_days_accumulated + days

        updates: dict[str, Any] = {
            "status": MembershipStatus.FROZEN.value,
            "is_frozen": True,
            "freeze_start_date": today.isoformat(),
            "freeze_end_date": freeze_end.isoformat(),
            "frozen_days_accumulated": accumulated,
            "end_date": new_end.isoformat(),
            "GSI1SK": f"EXPIRY#{new_end.isoformat()}#STUDENT#{student_id}",
            "GSI3SK": f"INACTIVE_MEMBERSHIP#{membership_id}",
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}", updates)
        return MembershipDynamoItem.model_validate(raw)

    def unfreeze(self, student_id: str, membership_id: str) -> MembershipDynamoItem:
        """Unfreeze a membership, restoring it to active status."""
        updates: dict[str, Any] = {
            "status": MembershipStatus.ACTIVE.value,
            "is_frozen": False,
            "freeze_start_date": None,
            "freeze_end_date": None,
            "GSI3SK": "ACTIVE_MEMBERSHIP",
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}", updates)
        return MembershipDynamoItem.model_validate(raw)

    def decrement_classes_remaining(self, student_id: str, membership_id: str) -> int:
        """Atomically decrement the classes_remaining counter.

        Returns the new remaining count.
        Used when a student attends a class-pack session.
        """
        return self.update_counter(
            pk=f"STUDENT#{student_id}",
            sk=f"MEMBERSHIP#{membership_id}",
            attribute="classes_remaining",
            delta=-1,
        )
