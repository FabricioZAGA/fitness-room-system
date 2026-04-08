"""Transaction repository — DynamoDB access patterns for Transactions and CashCuts."""

from typing import Any

from src.models.transaction import (
    CashCutCreate,
    CashCutDynamoItem,
    TransactionCreate,
    TransactionDynamoItem,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


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

    # ------------------------------------------------------------------
    # Cash Cuts
    # ------------------------------------------------------------------

    def create_cash_cut(
        self,
        data: CashCutCreate,
        transactions: list[TransactionDynamoItem],
    ) -> CashCutDynamoItem:
        """Create a cash cut summarizing transactions for a date.

        Access pattern: PUT PK=CASHCUT#{id}, SK=METADATA.
        """
        item = CashCutDynamoItem.from_data(data, transactions)
        self.put_item(item.model_dump(mode="json"))
        return item

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
