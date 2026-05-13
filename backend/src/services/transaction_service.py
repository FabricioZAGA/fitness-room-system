"""Transaction service — business logic for payments and cash cuts."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.common import mexico_today

from src.models.transaction import (
    CashCutCreate,
    CashCutResponse,
    TransactionCreate,
    TransactionResponse,
)
from src.repositories.transaction_repository import TransactionRepository

logger = Logger()


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

    def create_cash_cut(self, data: CashCutCreate) -> CashCutResponse:
        """Perform an end-of-day cash cut.

        Collects all transactions for the given date, builds a summary,
        and stores the cut record.
        """
        date_str = data.cut_date.isoformat()
        logger.info("Performing cash cut", extra={"date": date_str})

        # Fetch all transactions for the day (up to 500)
        transactions, _ = self._repo.list_transactions_by_date(date_str, limit=500)

        cut_item = self._repo.create_cash_cut(data, transactions)
        tx_responses = [t.to_response() for t in transactions]
        return cut_item.to_response(tx_responses)

    def get_cash_cut(self, cut_id: str) -> CashCutResponse:
        """Get a cash cut summary and its transactions."""
        cut_item = self._repo.get_cash_cut(cut_id)
        date_str = cut_item.cut_date
        transactions, _ = self._repo.list_transactions_by_date(date_str, limit=500)
        tx_responses = [t.to_response() for t in transactions]
        return cut_item.to_response(tx_responses)

    def list_cash_cuts(
        self, limit: int = 30
    ) -> tuple[list[CashCutResponse], dict[str, Any] | None]:
        """List recent cash cuts (no transactions detail — summary only)."""
        items, next_key = self._repo.list_cash_cuts(limit=limit)
        return [i.to_response() for i in items], next_key

    def get_today_summary(self) -> dict[str, Any]:
        """Quick daily income summary for the dashboard cash register view."""
        today = mexico_today().isoformat()
        transactions, _ = self._repo.list_transactions_by_date(today, limit=500)

        total_cash = sum(
            t.amount for t in transactions if t.payment_method == "cash"
        )
        total_card = sum(
            t.amount for t in transactions if t.payment_method == "card"
        )
        total_transfer = sum(
            t.amount for t in transactions if t.payment_method == "transfer"
        )

        by_type: dict[str, float] = {}
        for t in transactions:
            by_type[t.transaction_type] = by_type.get(t.transaction_type, 0) + t.amount

        return {
            "date": today,
            "transaction_count": len(transactions),
            "total_cash": total_cash,
            "total_card": total_card,
            "total_transfer": total_transfer,
            "grand_total": total_cash + total_card + total_transfer,
            "by_type": by_type,
        }
