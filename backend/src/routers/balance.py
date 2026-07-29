"""Balance router — endpoints for student balance (monedero interno / saldo a favor)."""

from typing import Any

from fastapi import APIRouter, Depends, Query

from src.models.balance import (
    BalanceApplyRequest,
    BalanceDepositRequest,
    BalanceMovementResponse,
    StudentBalanceResponse,
)
from src.services.balance_service import BalanceService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/balance", tags=["Balance"])


def get_service() -> BalanceService:
    """Dependency to create BalanceService instance."""
    return BalanceService()


@router.get(
    "/{student_id}",
    response_model=StudentBalanceResponse,
    summary="Get Student Balance",
    description="Get the current balance (saldo a favor) for a student.",
)
def get_balance(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: BalanceService = Depends(get_service),
) -> StudentBalanceResponse:
    """Get the current balance for a student."""
    return service.get_balance(student_id)


@router.post(
    "/{student_id}/deposit",
    response_model=BalanceMovementResponse,
    summary="Deposit to Balance",
    description="Deposit money into a student's balance (abono a cuenta).",
)
def deposit(
    student_id: str,
    data: BalanceDepositRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: BalanceService = Depends(get_service),
) -> BalanceMovementResponse:
    """Deposit money into a student's balance."""
    return service.deposit(student_id, data)


@router.post(
    "/{student_id}/apply",
    response_model=BalanceMovementResponse,
    summary="Apply Balance to Membership",
    description="Apply balance toward a membership payment.",
)
def apply_balance(
    student_id: str,
    data: BalanceApplyRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: BalanceService = Depends(get_service),
) -> BalanceMovementResponse:
    """Apply balance to a membership."""
    return service.apply_to_membership(student_id, data)


@router.get(
    "/{student_id}/movements",
    response_model=list[BalanceMovementResponse],
    summary="List Balance Movements",
    description="List balance movements for a student (newest first).",
)
def list_movements(
    student_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: BalanceService = Depends(get_service),
) -> list[BalanceMovementResponse]:
    """List balance movements for a student."""
    items, _ = service.list_movements(student_id, limit=limit)
    return items
