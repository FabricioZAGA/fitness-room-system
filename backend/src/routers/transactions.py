"""Transactions router — endpoints for payments and cash cuts (corte de caja)."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.transaction import (
    CashCutCreate,
    CashCutResponse,
    TransactionCreate,
    TransactionResponse,
)
from src.services.transaction_service import TransactionService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def get_service() -> TransactionService:
    return TransactionService()


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Transaction",
    description="Record a new payment (membership, class pack, product, other).",
)
def record_transaction(
    data: TransactionCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> TransactionResponse:
    return service.record_transaction(data)


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Get Transaction",
)
def get_transaction(
    transaction_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> TransactionResponse:
    return service.get_transaction(transaction_id)


@router.get(
    "",
    response_model=list[TransactionResponse],
    summary="List Transactions by Date",
    description="List all transactions for a given date (YYYY-MM-DD). Defaults to today.",
)
def list_transactions(
    date: str | None = Query(default=None, description="Date filter YYYY-MM-DD (default: today)"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> list[TransactionResponse]:
    from src.models.common import mexico_today
    date_str = date or mexico_today().isoformat()
    items, _ = service.list_by_date(date_str)
    return items


@router.get(
    "/student/{student_id}",
    response_model=list[TransactionResponse],
    summary="List Student Transactions",
    description="List all payment transactions for a specific student.",
)
def list_student_transactions(
    student_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> list[TransactionResponse]:
    items, _ = service.list_for_student(student_id)
    return items


@router.get(
    "/summary/today",
    summary="Today's Income Summary",
    description="Quick cash register summary for today's transactions.",
)
def today_summary(
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> dict[str, Any]:
    return service.get_today_summary()


# ---------------------------------------------------------------------------
# Cash cuts
# ---------------------------------------------------------------------------

@router.post(
    "/cashcut",
    response_model=CashCutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Cash Cut",
    description=(
        "Perform an end-of-day cash cut (corte de caja). "
        "Aggregates all transactions for the given date and stores a summary."
    ),
)
def create_cash_cut(
    data: CashCutCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> CashCutResponse:
    return service.create_cash_cut(data)


@router.get(
    "/cashcut",
    response_model=list[CashCutResponse],
    summary="List Cash Cuts",
    description="List recent cash cut records (summary only, no transaction detail).",
)
def list_cash_cuts(
    limit: int = Query(default=30, ge=1, le=100),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> list[CashCutResponse]:
    items, _ = service.list_cash_cuts(limit=limit)
    return items


@router.get(
    "/cashcut/{cut_id}",
    response_model=CashCutResponse,
    summary="Get Cash Cut",
    description="Get a specific cash cut with all its transactions.",
)
def get_cash_cut(
    cut_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> CashCutResponse:
    return service.get_cash_cut(cut_id)
