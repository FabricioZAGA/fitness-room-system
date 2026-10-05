"""Transaction service — business logic for payments and cash cuts."""

from datetime import datetime
from typing import Any, Literal

from aws_lambda_powertools import Logger

from src.models.common import mexico_today
from src.models.transaction import (
    CashCutCreate,
    CashCutResponse,
    TransactionCreate,
    TransactionDynamoItem,
    TransactionResponse,
    TransactionUpdate,
    sum_by_method,
)
from src.repositories.transaction_repository import TransactionRepository

logger = Logger()

SummaryScope = Literal["day", "period"]


class TransactionService:
    """Service for transaction and cash cut operations."""

    def __init__(self, repo: TransactionRepository | None = None) -> None:
        self._repo = repo or TransactionRepository()

    def record_transaction(self, data: TransactionCreate) -> TransactionResponse:
        """Record a new payment transaction."""
        logger.info(
            "Recording transaction",
            extra={
                "type": data.transaction_type,
                "amount": data.amount,
                "method": data.payment_method,
            },
        )
        item = self._repo.create_transaction(data)
        return item.to_response()

    def get_transaction(self, transaction_id: str) -> TransactionResponse:
        """Get a specific transaction by ID."""
        return self._repo.get_transaction(transaction_id).to_response()

    def update_transaction(
        self, transaction_id: str, data: TransactionUpdate
    ) -> TransactionResponse:
        """Update a transaction (admin-only)."""
        logger.info(
            "Updating transaction",
            extra={
                "transaction_id": transaction_id,
                "fields": list(data.model_dump(exclude_none=True).keys()),
            },
        )
        item = self._repo.update_transaction(transaction_id, data)
        return item.to_response()

    def delete_transaction(self, transaction_id: str) -> None:
        """Delete a transaction (admin-only)."""
        logger.info("Deleting transaction", extra={"transaction_id": transaction_id})
        self._repo.delete_transaction(transaction_id)

    def list_by_date(
        self,
        date_str: str,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[TransactionResponse], dict[str, Any] | None]:
        """List all transactions for a given date (YYYY-MM-DD)."""
        items, next_key = self._repo.list_transactions_by_date(
            date_str, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def list_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[TransactionResponse], dict[str, Any] | None]:
        """List all transactions for a specific student."""
        items, next_key = self._repo.list_transactions_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    # ------------------------------------------------------------------
    # Cash Cuts
    # ------------------------------------------------------------------

    def _last_cut_at(self, date_str: str) -> datetime | None:
        """Timestamp of the most recent cash cut for a date (None if no cut yet)."""
        cuts = self._repo.list_cash_cuts_for_date(date_str)
        return cuts[-1].created_at if cuts else None

    def _open_period_transactions(
        self, date_str: str
    ) -> tuple[list[TransactionDynamoItem], datetime | None]:
        """Transactions of ``date_str`` registered after the last cut of that day."""
        transactions, _ = self._repo.list_transactions_by_date(date_str, limit=500)
        last_cut_at = self._last_cut_at(date_str)
        if last_cut_at is not None:
            transactions = [t for t in transactions if t.created_at > last_cut_at]
        return transactions, last_cut_at

    def create_cash_cut(self, data: CashCutCreate) -> CashCutResponse:
        """Perform a cash cut (corte de caja).

        Only the transactions registered since the previous cut of the same day
        are included, so the register resets to zero immediately after a cut and
        several cuts per day (e.g. per shift) are possible.
        """
        date_str = data.cut_date.isoformat()
        transactions, last_cut_at = self._open_period_transactions(date_str)
        logger.info(
            "Performing cash cut",
            extra={
                "date": date_str,
                "period_start": last_cut_at.isoformat() if last_cut_at else None,
                "transaction_count": len(transactions),
            },
        )

        cut_item = self._repo.create_cash_cut(data, transactions, period_start=last_cut_at)
        tx_responses = [t.to_response() for t in transactions]
        return cut_item.to_response(tx_responses)

    def get_cash_cut(self, cut_id: str) -> CashCutResponse:
        """Get a cash cut summary and the transactions it covers."""
        cut_item = self._repo.get_cash_cut(cut_id)
        transactions, _ = self._repo.list_transactions_by_date(cut_item.cut_date, limit=500)
        tx_responses = [t.to_response() for t in transactions if cut_item.covers(t)]
        return cut_item.to_response(tx_responses)

    def list_cash_cuts(
        self, limit: int = 30
    ) -> tuple[list[CashCutResponse], dict[str, Any] | None]:
        """List recent cash cuts (no transactions detail — summary only)."""
        items, next_key = self._repo.list_cash_cuts(limit=limit)
        return [i.to_response() for i in items], next_key

    def get_today_summary(self, scope: SummaryScope = "day") -> dict[str, Any]:
        """Quick income summary for today.

        Args:
            scope: ``"day"`` — every transaction of the day (dashboard).
                ``"period"`` — only transactions since the last cash cut of the
                day (Caja view; resets to zero right after a cut).
        """
        today = mexico_today().isoformat()
        if scope == "period":
            transactions, last_cut_at = self._open_period_transactions(today)
        else:
            transactions, _ = self._repo.list_transactions_by_date(today, limit=500)
            last_cut_at = self._last_cut_at(today)

        totals = sum_by_method(transactions)

        by_type: dict[str, float] = {}
        for t in transactions:
            by_type[t.transaction_type] = by_type.get(t.transaction_type, 0) + t.amount

        return {
            "date": today,
            "scope": scope,
            "last_cut_at": last_cut_at.isoformat() if last_cut_at else None,
            "transaction_count": len(transactions),
            "total_cash": totals["cash"],
            "total_card": totals["card"],
            "total_transfer": totals["transfer"],
            "grand_total": sum(totals.values()),
            "by_type": by_type,
        }
