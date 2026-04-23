"""Uniqueness validation service — prevents duplicate email/phone across entities.

Checks students and instructors tables to ensure no two entities share the same
email or phone number. Used during create and update operations.
"""

from aws_lambda_powertools import Logger

from src.repositories.instructor_repository import InstructorRepository
from src.repositories.student_repository import StudentRepository

logger = Logger(child=True)


class UniquenessService:
    """Cross-entity uniqueness validator for email and phone."""

    def __init__(
        self,
        student_repo: StudentRepository | None = None,
        instructor_repo: InstructorRepository | None = None,
    ) -> None:
        self._students = student_repo or StudentRepository()
        self._instructors = instructor_repo or InstructorRepository()

    def check_email_available(
        self,
        email: str,
        exclude_student_id: str | None = None,
        exclude_instructor_id: str | None = None,
    ) -> str | None:
        """Check if email is already in use by another student or instructor.

        Args:
            email: Email address to check.
            exclude_student_id: Skip this student (for update operations).
            exclude_instructor_id: Skip this instructor (for update operations).

        Returns:
            Error message if email is taken, None if available.
        """
        normalized = email.strip().lower()

        # Check students
        student = self._students.find_by_email(normalized)
        if student and student.get("student_id") != exclude_student_id:
            return f"El email '{normalized}' ya está registrado por un alumno"

        # Check instructors
        instructor = self._instructors.find_by_email(normalized)
        if instructor and instructor.get("instructor_id") != exclude_instructor_id:
            return f"El email '{normalized}' ya está registrado por un instructor"

        return None

    def check_phone_available(
        self,
        phone: str,
        exclude_student_id: str | None = None,
        exclude_instructor_id: str | None = None,
    ) -> str | None:
        """Check if phone is already in use by another student or instructor.

        Args:
            phone: Phone number (E.164 format) to check.
            exclude_student_id: Skip this student (for update operations).
            exclude_instructor_id: Skip this instructor (for update operations).

        Returns:
            Error message if phone is taken, None if available.
        """
        # Check students
        student = self._students.find_by_phone(phone)
        if student and student.get("student_id") != exclude_student_id:
            return f"El teléfono '{phone}' ya está registrado por un alumno"

        # Check instructors
        instructor = self._instructors.find_by_phone(phone)
        if instructor and instructor.get("instructor_id") != exclude_instructor_id:
            return f"El teléfono '{phone}' ya está registrado por un instructor"

        return None

    def validate_create_student(self, email: str, phone: str | None) -> None:
        """Validate email/phone uniqueness for a new student.

        Raises:
            HTTPException 409 if email or phone is already taken.
        """
        from src.utils.exceptions import raise_conflict

        error = self.check_email_available(email)
        if error:
            raise_conflict(error)

        if phone:
            error = self.check_phone_available(phone)
            if error:
                raise_conflict(error)

    def validate_update_student(
        self, student_id: str, email: str | None, phone: str | None
    ) -> None:
        """Validate email/phone uniqueness for a student update.

        Raises:
            HTTPException 409 if email or phone is already taken by someone else.
        """
        from src.utils.exceptions import raise_conflict

        if email:
            error = self.check_email_available(email, exclude_student_id=student_id)
            if error:
                raise_conflict(error)

        if phone:
            error = self.check_phone_available(phone, exclude_student_id=student_id)
            if error:
                raise_conflict(error)

    def validate_create_instructor(self, email: str, phone: str | None) -> None:
        """Validate email/phone uniqueness for a new instructor.

        Raises:
            HTTPException 409 if email or phone is already taken.
        """
        from src.utils.exceptions import raise_conflict

        error = self.check_email_available(email)
        if error:
            raise_conflict(error)

        if phone:
            error = self.check_phone_available(phone)
            if error:
                raise_conflict(error)

    def validate_update_instructor(
        self, instructor_id: str, email: str | None, phone: str | None
    ) -> None:
        """Validate email/phone uniqueness for an instructor update.

        Raises:
            HTTPException 409 if email or phone is already taken by someone else.
        """
        from src.utils.exceptions import raise_conflict

        if email:
            error = self.check_email_available(
                email, exclude_instructor_id=instructor_id
            )
            if error:
                raise_conflict(error)

        if phone:
            error = self.check_phone_available(
                phone, exclude_instructor_id=instructor_id
            )
            if error:
                raise_conflict(error)
