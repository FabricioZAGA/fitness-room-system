"""Membership repository — DynamoDB access patterns for Memberships."""

from datetime import date, timedelta
from typing import Any

from src.models.common import mexico_today, utc_now
from src.models.membership import (
    GSI3_PENDING_PREFIX,
    MembershipCreate,
    MembershipDynamoItem,
    MembershipStatus,
    MembershipUpdate,
    gsi3_sk_for,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class MembershipRepository(DynamoRepository):
    """Repository for membership entity access patterns."""

    def create(
        self,
        data: MembershipCreate,
        status: MembershipStatus = MembershipStatus.ACTIVE,
    ) -> MembershipDynamoItem:
        """Create a new membership for a student.

        Access pattern: PUT PK=STUDENT#id, SK=MEMBERSHIP#id.
        """
        item = MembershipDynamoItem.from_create(data, status=status)
        self.put_item(item.model_dump(mode="json"))
        return item

    def list_all_for_student(self, student_id: str) -> list[MembershipDynamoItem]:
        """List every membership of a student (follows pagination).

        Access pattern: QUERY PK=STUDENT#id, SK begins_with MEMBERSHIP#.
        """
        result: list[MembershipDynamoItem] = []
        last_key: dict[str, Any] | None = None
        while True:
            items, last_key = self.list_for_student(
                student_id, limit=100, last_evaluated_key=last_key
            )
            result.extend(items)
            if not last_key:
                return result

    def list_pending_for_student(self, student_id: str) -> list[MembershipDynamoItem]:
        """List queued (pending) memberships of a student, earliest start first.

        Access pattern: GSI3 PK=STUDENT#id, SK begins_with PENDING_MEMBERSHIP#.
        """
        items, _ = self.query_gsi(
            index_name="GSI3",
            pk_name="GSI3PK",
            pk_value=f"STUDENT#{student_id}",
            sk_name="GSI3SK",
            sk_begins_with=GSI3_PENDING_PREFIX,
            limit=50,
        )
        return [MembershipDynamoItem.model_validate(i) for i in items]

    def list_all_items(self) -> list[MembershipDynamoItem]:
        """List every membership in the table (follows pagination).

        Used by the nightly roll job. Access pattern: GSI1 PK=MEMBERSHIPS.
        """
        result: list[MembershipDynamoItem] = []
        last_key: dict[str, Any] | None = None
        while True:
            items, last_key = self.list_all(limit=500, last_evaluated_key=last_key)
            result.extend(items)
            if not last_key:
                return result

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

    def list_all(
        self,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipDynamoItem], dict[str, Any] | None]:
        """List all memberships across all students (latest expiry first).

        Access pattern: GSI1 PK=MEMBERSHIPS, sorted by expiry date.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="MEMBERSHIPS",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
            scan_index_forward=False,
        )
        return [MembershipDynamoItem.model_validate(i) for i in items], next_key

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
        # Students who already renewed in advance (queued membership) are not
        # "expiring" — skip them so they get no alert or reminder.
        renewed = {
            m.student_id for m in filtered if self.list_pending_for_student(m.student_id)
        }
        return [m for m in filtered if m.student_id not in renewed], next_key

    def delete(self, student_id: str, membership_id: str) -> None:
        """Hard-delete a membership (compensating action when payment fails)."""
        self.delete_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}")

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

        if data.start_date is not None:
            updates["start_date"] = data.start_date.isoformat()
        if data.end_date is not None:
            updates["end_date"] = data.end_date.isoformat()
            updates["GSI1SK"] = f"EXPIRY#{data.end_date.isoformat()}#STUDENT#{student_id}"
        if data.membership_type is not None:
            updates["membership_type"] = data.membership_type
        if data.status is not None:
            updates["status"] = data.status.value
            start = (
                data.start_date.isoformat()
                if data.start_date is not None
                else self.get_by_id(student_id, membership_id).start_date
                if data.status == MembershipStatus.PENDING
                else ""
            )
            updates["GSI3SK"] = gsi3_sk_for(data.status.value, membership_id, start)
        if data.price_paid is not None:
            updates["price_paid"] = data.price_paid
        if data.payment_method is not None:
            updates["payment_method"] = data.payment_method
        if data.classes_total is not None:
            updates["classes_total"] = data.classes_total
        if data.classes_remaining is not None:
            updates["classes_remaining"] = data.classes_remaining
        if data.notes is not None:
            updates["notes"] = data.notes
        if data.duo_partner_id is not None:
            updates["duo_partner_id"] = data.duo_partner_id
        if data.duo_partner_name is not None:
            updates["duo_partner_name"] = data.duo_partner_name

        raw = self.update_item(
            f"STUDENT#{student_id}",
            f"MEMBERSHIP#{membership_id}",
            updates,
        )
        return MembershipDynamoItem.model_validate(raw)

    def shift_dates(
        self, student_id: str, membership_id: str, days: int
    ) -> MembershipDynamoItem:
        """Move start_date and end_date by ``days`` (used for queued renewals)."""
        item = self.get_by_id(student_id, membership_id)
        new_start = (date.fromisoformat(item.start_date) + timedelta(days=days)).isoformat()
        new_end = (date.fromisoformat(item.end_date) + timedelta(days=days)).isoformat()
        updates: dict[str, Any] = {
            "start_date": new_start,
            "end_date": new_end,
            "GSI1SK": f"EXPIRY#{new_end}#STUDENT#{student_id}",
            "GSI3SK": gsi3_sk_for(item.status, membership_id, new_start),
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}", updates)
        return MembershipDynamoItem.model_validate(raw)

    def freeze(
        self, student_id: str, membership_id: str, days: int | None
    ) -> tuple[MembershipDynamoItem, int]:
        """Freeze a membership.

        Args:
            days: Planned freeze length. The end date is extended by this many
                days right away. ``None`` = indefinite freeze (suspension or
                deactivation): the end date is adjusted on unfreeze instead.

        Returns:
            Tuple of (updated item, days added to end_date).
        """
        item = self.get_by_id(student_id, membership_id)
        today = mexico_today()
        planned = days or 0
        new_end = date.fromisoformat(item.end_date) + timedelta(days=planned)

        updates: dict[str, Any] = {
            "status": MembershipStatus.FROZEN.value,
            "is_frozen": True,
            "freeze_start_date": today.isoformat(),
            "freeze_end_date": (today + timedelta(days=planned)).isoformat() if days else None,
            "frozen_days_accumulated": item.frozen_days_accumulated + planned,
            "end_date": new_end.isoformat(),
            "GSI1SK": f"EXPIRY#{new_end.isoformat()}#STUDENT#{student_id}",
            "GSI3SK": gsi3_sk_for(MembershipStatus.FROZEN.value, membership_id, ""),
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}", updates)
        return MembershipDynamoItem.model_validate(raw), planned

    def unfreeze(
        self,
        student_id: str,
        membership_id: str,
        effective_date: date | None = None,
    ) -> tuple[MembershipDynamoItem, int]:
        """Unfreeze a membership, crediting exactly the days it was frozen.

        The end date had already been extended by the *planned* freeze days
        (``freeze_end - freeze_start``); it is corrected to the *actual* days
        frozen (``effective_date - freeze_start``). This also fixes legacy
        365-day suspension freezes.

        Args:
            effective_date: Day the freeze ends (default: today).

        Returns:
            Tuple of (updated item, net days added to end_date by this call).
        """
        item = self.get_by_id(student_id, membership_id)
        effective = effective_date or mexico_today()
        delta = 0
        end = date.fromisoformat(item.end_date)
        accumulated = item.frozen_days_accumulated
        if item.freeze_start_date:
            start = date.fromisoformat(item.freeze_start_date)
            planned = (
                (date.fromisoformat(item.freeze_end_date) - start).days
                if item.freeze_end_date
                else 0
            )
            actual = max((effective - start).days, 0)
            delta = actual - planned
            end += timedelta(days=delta)
            accumulated = max(accumulated + delta, 0)

        updates: dict[str, Any] = {
            "status": MembershipStatus.ACTIVE.value,
            "is_frozen": False,
            "freeze_start_date": None,
            "freeze_end_date": None,
            "frozen_days_accumulated": accumulated,
            "end_date": end.isoformat(),
            "GSI1SK": f"EXPIRY#{end.isoformat()}#STUDENT#{student_id}",
            "GSI3SK": gsi3_sk_for(MembershipStatus.ACTIVE.value, membership_id, ""),
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(f"STUDENT#{student_id}", f"MEMBERSHIP#{membership_id}", updates)
        return MembershipDynamoItem.model_validate(raw), delta

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
