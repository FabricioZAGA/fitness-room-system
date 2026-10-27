"""Transaction service — business logic for payments and cash cuts."""

from typing import Any, Literal

from aws_lambda_powertools import Logger

from src.models.common import MX_TZ, mexico_today
from src.models.transaction import (
    CashCutCreate,
    CashCutDynamoItem,
    CashCutResponse,
    ChargeCreate,
    ChargeResponse,
    OpenPeriodResponse,
    TransactionCreate,
    TransactionDynamoItem,
    TransactionResponse,
    TransactionType,
    TransactionUpdate,
    sum_by_method,
)
from src.repositories.transaction_repository import TransactionRepository
from src.services.settlement_service import ChargeRequest, PaymentSettlementService

logger = Logger()

SummaryScope = Literal["day", "period"]

TRANSACTION_TYPE_DESCRIPTIONS: dict[TransactionType, str] = {
    TransactionType.MEMBERSHIP: "Membresía",
    TransactionType.CLASS_PACK: "Paquete de clases",
    TransactionType.PRODUCT: "Producto",
    TransactionType.OTHER: "Otro cobro",
}


class TransactionService:
    """Service for transaction and cash cut operations."""

    def __init__(
        self,
        repo: TransactionRepository | None = None,
        settlement: PaymentSettlementService | None = None,
    ) -> None:
        self._repo = repo or TransactionRepository()
        self._settlement = settlement or PaymentSettlementService(transaction_repo=self._repo)

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
    # Charges (Caja "Otro cobro" with balance / fiado options)
    # ------------------------------------------------------------------

    def register_charge(self, data: ChargeCreate) -> ChargeResponse:
        """Register a charge that can be paid now, with balance or left as debt."""
        result = self._settlement.settle(
            ChargeRequest(
                student_id=data.student_id,
                amount=data.amount,
                concept_type=data.transaction_type,
                description=data.notes or TRANSACTION_TYPE_DESCRIPTIONS[data.transaction_type],
                payment_status=data.payment_status,
                balance_amount=data.balance_amount,
                payment_method=data.payment_method.value,
                payment_splits=data.payment_splits,
            )
        )
        return ChargeResponse(
            transaction_id=result.transaction_id,
            debt_id=result.debt_id,
            balance_applied=result.balance_applied,
            amount_paid_now=result.amount_paid_now,
            reference_id=result.reference_id,
        )

    # ------------------------------------------------------------------
    # Cash Cuts
    # ------------------------------------------------------------------

    def _open_period(
        self,
    ) -> tuple[list[TransactionDynamoItem], CashCutDynamoItem | None, str]:
        """Transactions registered since the last cash cut of **any** day.

        The register accumulates across days until a cut is made (it no longer
        resets at midnight).

        Returns:
            Tuple of (transactions oldest first, last cut or None, first date the
            period can contain — the last cut's CDMX date, or the oldest open
            transaction's date when no cut was ever made).
        """
        today = mexico_today().isoformat()
        last_cut = self._repo.get_latest_cash_cut()
        start_date = (
            last_cut.created_at.astimezone(MX_TZ).date().isoformat() if last_cut else None
        )
        transactions = self._repo.list_transactions_between(start_date, today)
        if last_cut is not None:
            transactions = [t for t in transactions if t.created_at > last_cut.created_at]
        transactions.sort(key=lambda t: t.created_at)
        oldest = transactions[0].transaction_date if transactions else today
        return transactions, last_cut, start_date or oldest

    def create_cash_cut(self, data: CashCutCreate) -> CashCutResponse:
        """Perform a cash cut (corte de caja).

        Includes every transaction registered since the previous cut (whatever
        its day), so the register resets to zero only when a cut is made and
        several cuts per day (e.g. per shift) are still possible.
        """
        transactions, last_cut, first_date = self._open_period()
        period_start = last_cut.created_at if last_cut else None
        logger.info(
            "Performing cash cut",
            extra={
                "cut_date": data.cut_date.isoformat(),
                "period_start": period_start.isoformat() if period_start else None,
                "period_start_date": first_date,
                "transaction_count": len(transactions),
            },
        )

        cut_item = self._repo.create_cash_cut(
            data, transactions, period_start=period_start, period_start_date=first_date
        )
        tx_responses = [t.to_response() for t in transactions]
        return cut_item.to_response(tx_responses)

    def get_cash_cut(self, cut_id: str) -> CashCutResponse:
        """Get a cash cut summary and the transactions it covers."""
        cut_item = self._repo.get_cash_cut(cut_id)
        transactions = self._repo.list_transactions_between(
            cut_item.first_covered_date, cut_item.cut_date
        )
        tx_responses = [t.to_response() for t in transactions if cut_item.covers(t)]
        return cut_item.to_response(tx_responses)

    def list_cash_cuts(
        self, limit: int = 30
    ) -> tuple[list[CashCutResponse], dict[str, Any] | None]:
        """List recent cash cuts (no transactions detail — summary only)."""
        items, next_key = self._repo.list_cash_cuts(limit=limit)
        return [i.to_response() for i in items], next_key

    def get_open_period(self) -> OpenPeriodResponse:
        """Everything registered since the last cash cut (Caja view)."""
        transactions, last_cut, _ = self._open_period()
        today = mexico_today().isoformat()
        oldest = transactions[0].transaction_date if transactions else today
        totals = sum_by_method(transactions)
        return OpenPeriodResponse(
            last_cut_at=last_cut.created_at if last_cut else None,
            period_start_date=oldest,
            includes_previous_days=oldest < today,
            transaction_count=len(transactions),
            total_cash=totals["cash"],
            total_card=totals["card"],
            total_transfer=totals["transfer"],
            grand_total=sum(totals.values()),
            by_type=self._by_type(transactions),
            transactions=[t.to_response() for t in reversed(transactions)],
        )

    @staticmethod
    def _by_type(transactions: list[TransactionDynamoItem]) -> dict[str, float]:
        """Sum transaction amounts per transaction type."""
        by_type: dict[str, float] = {}
        for t in transactions:
            by_type[t.transaction_type] = by_type.get(t.transaction_type, 0) + t.amount
        return by_type

    def get_today_summary(self, scope: SummaryScope = "day") -> dict[str, Any]:
        """Quick income summary.

        Args:
            scope: ``"day"`` — every transaction of today (dashboard).
                ``"period"`` — every transaction since the last cash cut, across
                days (Caja view; resets to zero only after a cut).
        """
        today = mexico_today().isoformat()
        if scope == "period":
            transactions, last_cut, _ = self._open_period()
            last_cut_at = last_cut.created_at if last_cut else None
            first_date = transactions[0].transaction_date if transactions else today
        else:
            transactions = self._repo.list_transactions_between(today, today)
            latest = self._repo.get_latest_cash_cut()
            last_cut_at = latest.created_at if latest else None
            first_date = today

        totals = sum_by_method(transactions)
        return {
            "date": today,
            "scope": scope,
            "last_cut_at": last_cut_at.isoformat() if last_cut_at else None,
            "period_start_date": first_date,
            "transaction_count": len(transactions),
            "total_cash": totals["cash"],
            "total_card": totals["card"],
            "total_transfer": totals["transfer"],
            "grand_total": sum(totals.values()),
            "by_type": self._by_type(transactions),
        }
