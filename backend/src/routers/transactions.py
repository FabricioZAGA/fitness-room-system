"""Transactions router — endpoints for payments and cash cuts (corte de caja)."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.models.common import MessageResponse
from src.models.transaction import (
    CashCutCreate,
    CashCutResponse,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from src.services.transaction_service import SummaryScope, TransactionService
from src.utils.auth import get_current_user, require_admin_only

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


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Update Transaction",
    description="Update a transaction's attributes (admin-only).",
    dependencies=[Depends(require_admin_only())],
)
def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    confirm: bool = Query(
        default=False,
        description="Must be true to confirm high-risk changes (e.g. amount)",
    ),
    service: TransactionService = Depends(get_service),
) -> TransactionResponse:
    """Update a transaction (admin-only)."""
    if data.amount is not None and not confirm:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cambiar el monto es una operación de alto riesgo. "
            "Envía confirm=true para continuar.",
        )
    return service.update_transaction(transaction_id, data)


@router.delete(
    "/{transaction_id}",
    response_model=MessageResponse,
    summary="Delete Transaction",
    description="Permanently delete a transaction (admin-only).",
    dependencies=[Depends(require_admin_only())],
)
def delete_transaction(
    transaction_id: str,
    confirm: bool = Query(
        default=False,
        description="Must be true to confirm deletion",
    ),
    service: TransactionService = Depends(get_service),
) -> MessageResponse:
    """Delete a transaction (admin-only)."""
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Eliminar una transacción es irreversible. "
            "Envía confirm=true para continuar.",
        )
    service.delete_transaction(transaction_id)
    return MessageResponse(message=f"Transaction '{transaction_id}' deleted.")


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
    description=(
        "Quick cash register summary for today's transactions. "
        "scope=day (default) covers the whole day; scope=period only covers "
        "transactions since the last cash cut."
    ),
)
def today_summary(
    scope: SummaryScope = Query(default="day", description="day | period"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: TransactionService = Depends(get_service),
) -> dict[str, Any]:
    return service.get_today_summary(scope=scope)


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
