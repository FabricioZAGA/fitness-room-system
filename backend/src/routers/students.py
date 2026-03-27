"""Students router — CRUD endpoints for student management."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.common import MessageResponse, PaginatedResponse
from src.models.student import StudentCreate, StudentResponse, StudentStatus, StudentUpdate
from src.services.student_service import StudentService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/students", tags=["Students"])


def get_service() -> StudentService:
    """Dependency: return a StudentService instance."""
    return StudentService()


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Student",
    description="Register a new student in the system. Email must be unique.",
)
def create_student(
    data: StudentCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Create a new student."""
    return service.create_student(data)


@router.get(
    "",
    response_model=PaginatedResponse[StudentResponse],
    summary="List Students",
    description="List all students with optional filtering by status and pagination.",
)
def list_students(
    status_filter: StudentStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    last_key: str | None = Query(default=None, description="Pagination token from previous response"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> PaginatedResponse[StudentResponse]:
    """List all students."""
    last_evaluated_key = {"PK": last_key} if last_key else None
    items, next_key = service.list_students(
        status=status_filter,
        limit=limit,
        last_evaluated_key=last_evaluated_key,
    )
    return PaginatedResponse(
        items=items,
        total=len(items),
        page=1,
        page_size=limit,
        has_more=next_key is not None,
        last_evaluated_key=next_key.get("PK") if next_key else None,
    )


@router.get(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Get Student",
    description="Get a student's full profile by ID.",
)
def get_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Get a student by ID."""
    return service.get_student(student_id)


@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Update Student",
    description="Partially update a student's profile. Only provided fields will be updated.",
)
def update_student(
    student_id: str,
    data: StudentUpdate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Update a student's profile."""
    return service.update_student(student_id, data)


@router.post(
    "/{student_id}/activate",
    response_model=StudentResponse,
    summary="Activate Student",
    description="Set the student's status to 'active'.",
)
def activate_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Activate a student."""
    return service.activate_student(student_id)


@router.post(
    "/{student_id}/deactivate",
    response_model=StudentResponse,
    summary="Deactivate Student",
    description="Set the student's status to 'inactive'.",
)
def deactivate_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> StudentResponse:
    """Deactivate a student."""
    return service.deactivate_student(student_id)


@router.delete(
    "/{student_id}",
    response_model=MessageResponse,
    summary="Delete Student",
    description="Permanently delete a student. This action cannot be undone.",
)
def delete_student(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: StudentService = Depends(get_service),
) -> MessageResponse:
    """Delete a student by ID."""
    service.delete_student(student_id)
    return MessageResponse(message=f"Student '{student_id}' deleted successfully.")
