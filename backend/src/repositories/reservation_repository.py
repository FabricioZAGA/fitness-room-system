"""Reservation repository — DynamoDB access patterns for Reservations and Waitlist."""

from typing import Any

from boto3.dynamodb.conditions import Attr

from src.models.common import utc_now
from src.models.reservation import (
    ReservationCreate,
    ReservationDynamoItem,
    ReservationStatus,
    WaitlistDynamoItem,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceAlreadyExistsException


# Statuses that occupy a physical spot in the class (count toward capacity).
COUNTED_STATUSES: frozenset[str] = frozenset(
    {
        ReservationStatus.CONFIRMED.value,
        ReservationStatus.ATTENDED.value,
        ReservationStatus.NO_SHOW.value,
    }
)


class ReservationRepository(DynamoRepository):
    """Repository for reservation and waitlist entity access patterns."""

    def create_reservation(
        self,
        data: ReservationCreate,
        class_date: str,
    ) -> ReservationDynamoItem:
        """Create a confirmed reservation for a student in a class.

        Access pattern: PUT PK=CLASS#id, SK=RESERVATION#student_id.
        Condition: reservation must NOT already exist.
        """
        item = ReservationDynamoItem.from_create(data, class_date)
        success = self.conditional_put_item(
            item.model_dump(mode="json"),
            Attr("PK").not_exists(),
        )
        if not success:
            raise ResourceAlreadyExistsException(
                f"Student '{data.student_id}' already has a reservation for class '{data.class_id}'"
            )
        return item

    def get_reservation(self, class_id: str, student_id: str) -> ReservationDynamoItem | None:
        """Get a reservation for a specific student in a specific class.

        Access pattern: GET PK=CLASS#id, SK=RESERVATION#student_id.
        Returns None if no reservation exists.
        """
        raw = self.get_item(f"CLASS#{class_id}", f"RESERVATION#{student_id}")
        if raw is None:
            return None
        return ReservationDynamoItem.model_validate(raw)

    def get_waitlist_entry(self, class_id: str, student_id: str) -> WaitlistDynamoItem | None:
        """Find a student's waitlist entry for a class (any position).

        Access pattern: QUERY PK=CLASS#id, SK begins_with WAITLIST#, filter student_id.
        """
        items, _ = self.query_by_pk(pk=f"CLASS#{class_id}", sk_begins_with="WAITLIST#")
        for raw in items:
            if raw.get("student_id") == student_id:
                return WaitlistDynamoItem.model_validate(raw)
        return None

    def get_reservation_or_waitlist(
        self, class_id: str, student_id: str
    ) -> ReservationDynamoItem | WaitlistDynamoItem | None:
        """Return the student's active record for a class, whichever kind exists.

        Checks RESERVATION# first, then WAITLIST#.
        """
        reservation = self.get_reservation(class_id, student_id)
        if reservation is not None:
            return reservation
        return self.get_waitlist_entry(class_id, student_id)

    def delete_stale_reservation(self, class_id: str, student_id: str) -> None:
        """Delete a RESERVATION# record if it exists (ignore if missing)."""
        try:
            self.delete_item(f"CLASS#{class_id}", f"RESERVATION#{student_id}")
        except Exception:
            pass

    def recount(self, class_id: str) -> tuple[int, int]:
        """Recompute authoritative counters for a class from its items.

        reservations_count = RESERVATION# items whose status occupies a spot
        waitlist_count     = number of WAITLIST# items

        Returns (reservations_count, waitlist_count). Does NOT write — the
        caller (service) persists via ClassRepository.set_counts.
        """
        items, _ = self.query_by_pk(pk=f"CLASS#{class_id}")
        reservations = 0
        waitlist = 0
        for raw in items:
            sk = str(raw.get("SK", ""))
            if sk.startswith("RESERVATION#"):
                if raw.get("status") in COUNTED_STATUSES:
                    reservations += 1
            elif sk.startswith("WAITLIST#"):
                waitlist += 1
        return reservations, waitlist

    def sync_class_date(self, class_id: str, class_date: str) -> int:
        """Rewrite the denormalized class date on every reservation/waitlist item.

        Used when a class is moved to another day so students' reservation
        lists (GSI1, sorted by date) and the portal reflect the new date
        without re-enrolling anyone.

        Returns the number of items updated.
        """
        items, _ = self.query_by_pk(pk=f"CLASS#{class_id}")
        now = utc_now().isoformat()
        updated = 0
        for raw in items:
            sk = str(raw.get("SK", ""))
            if sk.startswith("RESERVATION#"):
                values: dict[str, Any] = {
                    "class_date": class_date,
                    "GSI1SK": f"CLASS#{class_date}#CLASS#{class_id}",
                    "updated_at": now,
                }
            elif sk.startswith("WAITLIST#"):
                values = {"class_date": class_date, "updated_at": now}
            else:
                continue
            self.set_attributes(str(raw["PK"]), sk, values)
            updated += 1
        return updated

    def list_for_class(
        self,
        class_id: str,
        limit: int = 100,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ReservationDynamoItem], dict[str, Any] | None]:
        """List all confirmed reservations for a class.

        Access pattern: QUERY PK=CLASS#id, SK begins_with RESERVATION#.
        """
        items, next_key = self.query_by_pk(
            pk=f"CLASS#{class_id}",
            sk_begins_with="RESERVATION#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [ReservationDynamoItem.model_validate(i) for i in items], next_key

    def list_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ReservationDynamoItem], dict[str, Any] | None]:
        """List all reservations for a student across all classes.

        Access pattern: GSI1 PK=STUDENT#id, SK begins_with CLASS#.
        Only RESERVATION# items — use list_all_for_student to include waitlist.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value=f"STUDENT#{student_id}",
            sk_name="GSI1SK",
            sk_begins_with="CLASS#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
            scan_index_forward=False,
        )
        return [ReservationDynamoItem.model_validate(i) for i in items], next_key

    def list_waitlist_for_student(self, student_id: str) -> list[WaitlistDynamoItem]:
        """List all waitlist entries for a student.

        Access pattern: GSI1 PK=STUDENT#id, SK begins_with WAITLIST#.
        """
        items, _ = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value=f"STUDENT#{student_id}",
            sk_name="GSI1SK",
            sk_begins_with="WAITLIST#",
        )
        return [WaitlistDynamoItem.model_validate(i) for i in items]

    def list_all_for_student(
        self, student_id: str, limit: int = 50
    ) -> list[ReservationDynamoItem | WaitlistDynamoItem]:
        """Reservations + waitlist entries for a student, newest class first."""
        reservations, _ = self.list_for_student(student_id, limit=limit)
        waitlist = self.list_waitlist_for_student(student_id)
        combined: list[ReservationDynamoItem | WaitlistDynamoItem] = [*reservations, *waitlist]
        combined.sort(key=lambda r: r.class_date, reverse=True)
        return combined

    def cancel_reservation(self, class_id: str, student_id: str) -> ReservationDynamoItem:
        """Cancel a confirmed reservation.

        Access pattern: UPDATE PK=CLASS#id, SK=RESERVATION#student_id.
        """
        updates: dict[str, Any] = {
            "status": ReservationStatus.CANCELLED.value,
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(
            f"CLASS#{class_id}",
            f"RESERVATION#{student_id}",
            updates,
        )
        return ReservationDynamoItem.model_validate(raw)

    def mark_attendance(
        self,
        class_id: str,
        student_id: str,
        attended: bool,
    ) -> ReservationDynamoItem:
        """Mark a student as attended or no-show for a class.

        Access pattern: UPDATE PK=CLASS#id, SK=RESERVATION#student_id.
        """
        status = ReservationStatus.ATTENDED if attended else ReservationStatus.NO_SHOW
        updates: dict[str, Any] = {
            "status": status.value,
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(
            f"CLASS#{class_id}",
            f"RESERVATION#{student_id}",
            updates,
        )
        return ReservationDynamoItem.model_validate(raw)

    def admin_update_status(
        self,
        class_id: str,
        student_id: str,
        new_status: ReservationStatus,
    ) -> ReservationDynamoItem:
        """Admin override: set any status on a reservation.

        Access pattern: UPDATE PK=CLASS#id, SK=RESERVATION#student_id.
        """
        updates: dict[str, Any] = {
            "status": new_status.value,
            "updated_at": utc_now().isoformat(),
        }
        raw = self.update_item(
            f"CLASS#{class_id}",
            f"RESERVATION#{student_id}",
            updates,
        )
        return ReservationDynamoItem.model_validate(raw)

    def add_to_waitlist(
        self,
        data: ReservationCreate,
        class_date: str,
        position: int,
    ) -> WaitlistDynamoItem:
        """Add a student to the class waitlist.

        Access pattern: PUT PK=CLASS#id, SK=WAITLIST#{position:05d}#student_id.
        """
        item = WaitlistDynamoItem.from_create(data, class_date, position)
        success = self.conditional_put_item(
            item.model_dump(mode="json"),
            Attr("PK").not_exists(),
        )
        if not success:
            raise ResourceAlreadyExistsException(
                f"Student '{data.student_id}' is already on the waitlist "
                f"for class '{data.class_id}'"
            )
        return item

    def get_waitlist_for_class(
        self,
        class_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[WaitlistDynamoItem], dict[str, Any] | None]:
        """Get ordered waitlist for a class.

        Access pattern: QUERY PK=CLASS#id, SK begins_with WAITLIST#.
        Items are ordered by position (ascending) due to lexicographic SK.
        """
        items, next_key = self.query_by_pk(
            pk=f"CLASS#{class_id}",
            sk_begins_with="WAITLIST#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [WaitlistDynamoItem.model_validate(i) for i in items], next_key

    def get_next_waitlist_position(self, class_id: str) -> int:
        """Get the next available position on the waitlist.

        Returns 1 if the waitlist is empty.
        """
        items, _ = self.get_waitlist_for_class(class_id, limit=1000)
        if not items:
            return 1
        return max(i.position for i in items) + 1

    def remove_from_waitlist(self, class_id: str, student_id: str, position: int) -> None:
        """Remove a student from the waitlist.

        Access pattern: DELETE PK=CLASS#id, SK=WAITLIST#{position:05d}#student_id.
        """
        self.delete_item(
            f"CLASS#{class_id}",
            f"WAITLIST#{position:05d}#{student_id}",
        )

    def remove_from_waitlist_by_student(
        self, class_id: str, student_id: str
    ) -> WaitlistDynamoItem | None:
        """Remove a student's waitlist entry without knowing its position.

        Returns the removed entry, or None if the student was not waitlisted.
        """
        entry = self.get_waitlist_entry(class_id, student_id)
        if entry is None:
            return None
        self.remove_from_waitlist(class_id, student_id, entry.position)
        return entry

    def promote_from_waitlist(
        self,
        class_id: str,
        class_date: str,
    ) -> WaitlistDynamoItem | None:
        """Promote the first waitlisted student to a confirmed reservation.

        Returns the promoted waitlist item, or None if the waitlist is empty.
        Called when a confirmed reservation is cancelled.
        """
        items, _ = self.get_waitlist_for_class(class_id, limit=1)
        if not items:
            return None

        first_on_waitlist = items[0]

        # A stale cancelled/attended/no_show RESERVATION# record would make the
        # conditional put fail — clear it before promoting.
        self.delete_stale_reservation(class_id, first_on_waitlist.student_id)

        self.create_reservation(
            ReservationCreate(
                student_id=first_on_waitlist.student_id,
                class_id=class_id,
            ),
            class_date=class_date,
        )

        self.remove_from_waitlist(
            class_id, first_on_waitlist.student_id, first_on_waitlist.position
        )

        return first_on_waitlist
