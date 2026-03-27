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
from src.utils.exceptions import ResourceAlreadyExistsException, ResourceNotFoundException


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
                f"Student '{data.student_id}' is already on the waitlist for class '{data.class_id}'"
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
