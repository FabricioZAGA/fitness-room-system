"""Debts router — endpoints for student debts (ventas pendientes / fiado)."""

from typing import Any

from fastapi import APIRouter, Depends, Query

from src.models.debt import PayDebtRequest, StudentDebtResponse
from src.services.debt_service import DebtService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/debts", tags=["Debts"])


def get_service() -> DebtService:
    """Dependency to create DebtService instance."""
    return DebtService()


@router.get(
    "/student/{student_id}",
    response_model=list[StudentDebtResponse],
    summary="List Student Debts",
    description="List all pending debts (fiado) for a specific student.",
)
def list_student_debts(
    student_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: DebtService = Depends(get_service),
) -> list[StudentDebtResponse]:
    """List pending debts for a student."""
    items, _ = service.list_for_student(student_id, limit=limit)
    return items


@router.get(
    "/pending",
    response_model=list[StudentDebtResponse],
    summary="List All Pending Debts",
    description="List all pending debts across all students.",
)
def list_all_pending(
    limit: int = Query(default=200, ge=1, le=500),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: DebtService = Depends(get_service),
) -> list[StudentDebtResponse]:
    """List all pending debts."""
    items, _ = service.list_all_pending(limit=limit)
    return items


@router.post(
    "/student/{student_id}/{sale_id}/pay",
    response_model=StudentDebtResponse,
    summary="Pay Debt",
    description="Mark a specific debt as paid. Creates a transaction and removes the debt.",
)
def pay_debt(
    student_id: str,
    sale_id: str,
    data: PayDebtRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: DebtService = Depends(get_service),
) -> StudentDebtResponse:
    """Pay a specific debt."""
    return service.pay_debt(student_id, sale_id, data)


@router.post(
    "/student/{student_id}/pay-all",
    response_model=list[StudentDebtResponse],
    summary="Pay All Debts",
    description="Pay all pending debts for a student at once.",
)
def pay_all_debts(
    student_id: str,
    data: PayDebtRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: DebtService = Depends(get_service),
) -> list[StudentDebtResponse]:
    """Pay all debts for a student."""
    return service.pay_all_debts(student_id, data)
