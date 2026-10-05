"""Transaction repository — DynamoDB access patterns for Transactions and CashCuts."""

from datetime import datetime
from typing import Any

from src.models.transaction import (
    CashCutCreate,
    CashCutDynamoItem,
    PaymentMethod,
    PaymentSplit,
    TransactionCreate,
    TransactionDynamoItem,
    TransactionUpdate,
    validate_payment_splits,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import InvalidOperationException, ResourceNotFoundException


class TransactionRepository(DynamoRepository):
    """Repository for Transaction and CashCut access patterns."""

    # ------------------------------------------------------------------
    # Transactions
    # ------------------------------------------------------------------

    def create_transaction(self, data: TransactionCreate) -> TransactionDynamoItem:
        """Create a new payment transaction.

        Access pattern: PUT PK=TRANSACTION#{id}, SK=METADATA.
        """
        item = TransactionDynamoItem.from_create(data)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_transaction(self, transaction_id: str) -> TransactionDynamoItem:
        """Get a transaction by ID."""
        raw = self.get_item(f"TRANSACTION#{transaction_id}", "METADATA")
        if raw is None:
            raise ResourceNotFoundException(f"Transaction '{transaction_id}' not found")
        return TransactionDynamoItem.model_validate(raw)

    def list_transactions_by_date(
        self,
        date_str: str,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[TransactionDynamoItem], dict[str, Any] | None]:
        """List all transactions for a specific date.

        Access pattern: GSI1 PK=TRANSACTIONS, SK begins_with DATE#{date}.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="TRANSACTIONS",
            sk_name="GSI1SK",
            sk_begins_with=f"DATE#{date_str}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [TransactionDynamoItem.model_validate(i) for i in items], next_key

    def list_transactions_for_student(
        self,
        student_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[TransactionDynamoItem], dict[str, Any] | None]:
        """List all transactions for a specific student.

        Access pattern: GSI2 PK=STUDENT#{id}, SK begins_with TX#.
        """
        items, next_key = self.query_gsi(
            index_name="GSI2",
            pk_name="GSI2PK",
            pk_value=f"STUDENT#{student_id}",
            sk_name="GSI2SK",
            sk_begins_with="TX#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        # Filter out non-transaction items (only TRANSACTION entity type)
        tx_items = [
            TransactionDynamoItem.model_validate(i)
            for i in items
            if i.get("EntityType") == "TRANSACTION"
        ]
        return tx_items, next_key

    def find_by_reference_id(
        self, student_id: str, reference_id: str
    ) -> TransactionDynamoItem | None:
        """Find a transaction linked to a specific reference (e.g. membership_id).

        Access pattern: GSI2 PK=STUDENT#{id}, SK begins_with TX#, filter reference_id.
        Returns the first matching transaction or None.
        """
        items, _ = self.query_gsi(
            index_name="GSI2",
            pk_name="GSI2PK",
            pk_value=f"STUDENT#{student_id}",
            sk_name="GSI2SK",
            sk_begins_with="TX#",
            limit=200,
        )
        for i in items:
            if i.get("EntityType") == "TRANSACTION" and i.get("reference_id") == reference_id:
                return TransactionDynamoItem.model_validate(i)
        return None

    def update_transaction(
        self, transaction_id: str, data: TransactionUpdate
    ) -> TransactionDynamoItem:
        """Update a transaction's mutable attributes.

        Access pattern: UPDATE PK=TRANSACTION#{id}, SK=METADATA.
        """
        existing = self.get_transaction(transaction_id)
        updates: dict[str, Any] = {}
        for field_name, value in data.model_dump(
            mode="json", exclude_none=True, exclude={"payment_splits"}
        ).items():
            updates[field_name] = value
        if not updates and data.payment_splits is None:
            return existing

        # Keep the mixed-payment breakdown consistent with amount/method.
        final_method = updates.get("payment_method", existing.payment_method)
        final_amount = float(updates.get("amount", existing.amount))
        if final_method == PaymentMethod.MIXED:
            splits = data.payment_splits
            if splits is None and existing.payment_splits:
                splits = [PaymentSplit.model_validate(s) for s in existing.payment_splits]
            try:
                validated = validate_payment_splits(final_method, final_amount, splits) or []
            except ValueError as exc:
                raise InvalidOperationException(str(exc)) from exc
            updates["payment_splits"] = [s.model_dump(mode="json") for s in validated]
        elif existing.payment_splits or data.payment_splits is not None:
            updates["payment_splits"] = None

        raw = self.update_item(existing.PK, existing.SK, updates)
        return TransactionDynamoItem.model_validate(raw)

    def delete_transaction(self, transaction_id: str) -> None:
        """Delete a transaction by ID.

        Access pattern: DELETE PK=TRANSACTION#{id}, SK=METADATA.
        """
        existing = self.get_transaction(transaction_id)
        self.delete_item(existing.PK, existing.SK)

    # ------------------------------------------------------------------
    # Cash Cuts
    # ------------------------------------------------------------------

    def create_cash_cut(
        self,
        data: CashCutCreate,
        transactions: list[TransactionDynamoItem],
        period_start: datetime | None = None,
    ) -> CashCutDynamoItem:
        """Create a cash cut summarizing transactions for a date.

        Access pattern: PUT PK=CASHCUT#{id}, SK=METADATA.
        """
        item = CashCutDynamoItem.from_data(data, transactions, period_start=period_start)
        self.put_item(item.model_dump(mode="json"))
        return item

    def list_cash_cuts_for_date(self, date_str: str) -> list[CashCutDynamoItem]:
        """List every cash cut of a given date, oldest first.

        Access pattern: GSI1 PK=CASHCUTS, SK begins_with DATE#{date}#.
        """
        items, _ = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="CASHCUTS",
            sk_name="GSI1SK",
            sk_begins_with=f"DATE#{date_str}#",
        )
        cuts = [CashCutDynamoItem.model_validate(i) for i in items]
        return sorted(cuts, key=lambda c: c.created_at)

    def list_cash_cuts(
        self,
        limit: int = 30,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[CashCutDynamoItem], dict[str, Any] | None]:
        """List all cash cuts, newest first.

        Access pattern: GSI1 PK=CASHCUTS, SK begins_with DATE#.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="CASHCUTS",
            sk_name="GSI1SK",
            sk_begins_with="DATE#",
            limit=limit,
            scan_index_forward=False,
            last_evaluated_key=last_evaluated_key,
        )
        return [CashCutDynamoItem.model_validate(i) for i in items], next_key

    def get_cash_cut(self, cut_id: str) -> CashCutDynamoItem:
        """Get a specific cash cut by ID."""
        raw = self.get_item(f"CASHCUT#{cut_id}", "METADATA")
        if raw is None:
            raise ResourceNotFoundException(f"Cash cut '{cut_id}' not found")
        return CashCutDynamoItem.model_validate(raw)
