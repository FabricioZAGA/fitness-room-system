"""Account router — student account statement (estado de cuenta)."""

from typing import Any

from fastapi import APIRouter, Depends

from src.models.account import StudentAccountResponse
from src.repositories.student_repository import StudentRepository
from src.services.account_service import AccountService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/students", tags=["Students"])


def get_service() -> AccountService:
    """Dependency: return an AccountService instance."""
    return AccountService()


@router.get(
    "/{student_id}/account",
    response_model=StudentAccountResponse,
    summary="Student Account Statement",
    description=(
        "Everything the student was charged (products, memberships, packs, other), "
        "how each charge was settled (paid now / with balance / still pending) and "
        "their balance deposits. Newest first."
    ),
)
def get_account_statement(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: AccountService = Depends(get_service),
) -> StudentAccountResponse:
    """Return the account statement of a student (404 if the student does not exist)."""
    StudentRepository().get_by_id(student_id)
    return service.get_statement(student_id)
