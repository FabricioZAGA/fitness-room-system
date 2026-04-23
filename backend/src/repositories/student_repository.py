"""Student repository — DynamoDB access patterns for Students."""

from typing import TYPE_CHECKING, Any

from boto3.dynamodb.conditions import Attr

from src.models.common import utc_now
from src.models.student import StudentCreate, StudentDynamoItem, StudentStatus, StudentUpdate
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceAlreadyExistsException, ResourceNotFoundException

if TYPE_CHECKING:
    from src.models.checkin import CheckinDynamoItem


class StudentRepository(DynamoRepository):
    """Repository for student entity access patterns."""

    def create(self, data: StudentCreate) -> StudentDynamoItem:
        """Create a new student.

        Access pattern: PUT new item with PK=STUDENT#id, SK=PROFILE.
        Condition: item must NOT already exist.
        """
        item = StudentDynamoItem.from_create(data)
        success = self.conditional_put_item(
            item.model_dump(mode="json"),
            Attr("PK").not_exists(),
        )
        if not success:
            raise ResourceAlreadyExistsException(
                f"Student with email '{data.email}' already exists"
            )
        return item

    def get_by_id(self, student_id: str) -> StudentDynamoItem:
        """Get a student by ID.

        Access pattern: GET PK=STUDENT#id, SK=PROFILE.
        """
        raw = self.get_item(f"STUDENT#{student_id}", "PROFILE")
        if raw is None:
            raise ResourceNotFoundException(f"Student '{student_id}' not found")
        return StudentDynamoItem.model_validate(raw)

    def list_all(
        self,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
        status: StudentStatus | None = None,
    ) -> tuple[list[StudentDynamoItem], dict[str, Any] | None]:
        """List all students, optionally filtered by status.

        Access pattern:
          - All students: GSI1 PK=STUDENTS
          - By status:    GSI1 PK=STUDENTS, SK begins_with STATUS#status
        """
        sk_begins_with = f"STATUS#{status.value}" if status else None
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="STUDENTS",
            sk_name="GSI1SK" if sk_begins_with else None,
            sk_begins_with=sk_begins_with,
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [StudentDynamoItem.model_validate(i) for i in items], next_key

    def list_by_status(
        self,
        status: StudentStatus,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[StudentDynamoItem], dict[str, Any] | None]:
        """List students filtered by a specific status.

        Access pattern: GSI2 PK=STATUS#status.
        """
        items, next_key = self.query_gsi(
            index_name="GSI2",
            pk_name="GSI2PK",
            pk_value=f"STATUS#{status.value}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [StudentDynamoItem.model_validate(i) for i in items], next_key

    def update(self, student_id: str, data: StudentUpdate) -> StudentDynamoItem:
        """Update an existing student's attributes.

        Access pattern: UPDATE PK=STUDENT#id, SK=PROFILE.
        """
        current = self.get_by_id(student_id)
        updates: dict[str, Any] = {"updated_at": utc_now().isoformat()}

        if data.first_name is not None:
            updates["first_name"] = data.first_name
        if data.last_name is not None:
            updates["last_name"] = data.last_name
        if data.email is not None:
            updates["email"] = data.email
        if data.phone is not None:
            updates["phone"] = data.phone
        if data.notes is not None:
            updates["notes"] = data.notes
        if data.birth_date is not None:
            updates["birth_date"] = data.birth_date.isoformat()
        if data.address is not None:
            updates["address"] = data.address
        if data.city is not None:
            updates["city"] = data.city
        if data.emergency_contact is not None:
            updates["emergency_contact"] = data.emergency_contact.model_dump()
        if data.photo_url is not None:
            updates["photo_url"] = data.photo_url

        if data.status is not None and data.status != StudentStatus(current.status):
            new_status = data.status.value
            updates["status"] = new_status
            updates["GSI1SK"] = f"STATUS#{new_status}#STUDENT#{student_id}"
            updates["GSI2PK"] = f"STATUS#{new_status}"

        raw = self.update_item(f"STUDENT#{student_id}", "PROFILE", updates)
        return StudentDynamoItem.model_validate(raw)

    def delete(self, student_id: str) -> None:
        """Delete a student by ID.

        Access pattern: DELETE PK=STUDENT#id, SK=PROFILE.
        """
        self.delete_item(f"STUDENT#{student_id}", "PROFILE")

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        """Find a student by email address.

        Note: Scans GSI1 with limit. For production at scale, maintain a separate
        email index item: PK=EMAIL#email, SK=STUDENT_REF.
        """
        normalized = email.strip().lower()
        items, _ = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="STUDENTS",
            limit=1000,
        )
        for item in items:
            if item.get("email", "").strip().lower() == normalized:
                return item
        return None

    def find_by_phone(self, phone: str) -> dict[str, Any] | None:
        """Find a student by phone number.

        Note: Scans GSI1 with limit. For production at scale, maintain a separate
        phone index item: PK=PHONE#phone, SK=STUDENT_REF.
        """
        items, _ = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="STUDENTS",
            limit=1000,
        )
        for item in items:
            if item.get("phone") and item["phone"] == phone:
                return item
        return None

    def put_checkin(self, item: "CheckinDynamoItem") -> None:
        """Store a check-in record in DynamoDB.

        Access pattern: PUT PK=STUDENT#id, SK=CHECKIN#{timestamp}.
        No condition expression — always overwrites (timestamp guarantees uniqueness).
        """
        self.put_item(item.model_dump(mode="json"))

    def list_checkins_for_student(
        self,
        student_id: str,
        limit: int = 30,
    ) -> list["CheckinDynamoItem"]:
        """List recent check-ins for a student, newest first.

        Access pattern: QUERY PK=STUDENT#id, SK begins_with CHECKIN#.
        """
        from src.models.checkin import CheckinDynamoItem as CheckinItem

        items, _ = self.query_by_pk(
            pk=f"STUDENT#{student_id}",
            sk_begins_with="CHECKIN#",
            limit=limit,
        )
        return list(reversed([CheckinItem.model_validate(i) for i in items]))
