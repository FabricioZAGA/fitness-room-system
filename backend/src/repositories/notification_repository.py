"""Notification repository — DynamoDB access for notification logs."""

from typing import Any

from src.models.notification import NotificationDynamoItem
from src.repositories.dynamo_repository import DynamoRepository


class NotificationRepository(DynamoRepository):
    """Repository for reading and writing notification log items."""

    def save(self, item: NotificationDynamoItem) -> None:
        """Persist a notification log entry to DynamoDB."""
        self._table.put_item(Item=self._floats_to_decimal(item.to_dict()))

    def list_recent(
        self,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        """List all notifications ordered by date descending (most recent first).

        Uses GSI1: GSI1PK=NOTIFICATIONS, GSI1SK=DATE#{date}T{time}#{id}.
        """
        return self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="NOTIFICATIONS",
            sk_name="GSI1SK",
            sk_begins_with="DATE#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
            scan_index_forward=False,
        )
