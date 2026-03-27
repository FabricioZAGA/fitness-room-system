"""Base DynamoDB repository with common CRUD operations.

All entity-specific repositories extend this class.
Direct boto3 calls outside this layer are NOT allowed.
"""

from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

from src.config import Settings, get_settings
from src.utils.exceptions import ResourceNotFoundException


class DynamoRepository:
    """Base repository providing DynamoDB operations for the single-table design."""

    def __init__(self, settings: Settings | None = None) -> None:
        """Initialize the repository with a DynamoDB table resource."""
        cfg = settings or get_settings()
        kwargs: dict[str, Any] = {"region_name": cfg.aws_region}
        if cfg.dynamodb_endpoint_url:
            kwargs["endpoint_url"] = cfg.dynamodb_endpoint_url

        dynamodb = boto3.resource("dynamodb", **kwargs)
        self._table = dynamodb.Table(cfg.dynamodb_table_name)

    def put_item(self, item: dict[str, Any]) -> None:
        """Insert or fully replace an item in the table."""
        self._table.put_item(Item=item)

    def get_item(self, pk: str, sk: str) -> dict[str, Any] | None:
        """Retrieve a single item by primary key. Returns None if not found."""
        response = self._table.get_item(Key={"PK": pk, "SK": sk})
        return response.get("Item")

    def get_item_or_raise(
        self, pk: str, sk: str, resource_name: str, resource_id: str
    ) -> dict[str, Any]:
        """Retrieve a single item or raise ResourceNotFoundException."""
        item = self.get_item(pk, sk)
        if item is None:
            raise ResourceNotFoundException(f"{resource_name} '{resource_id}' not found")
        return item

    def update_item(
        self,
        pk: str,
        sk: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        """Update specific attributes of an existing item.

        Args:
            pk: Partition key value.
            sk: Sort key value.
            updates: Dictionary of attribute names to new values.

        Returns:
            The updated item attributes.
        """
        update_expression_parts: list[str] = []
        expression_attribute_names: dict[str, str] = {}
        expression_attribute_values: dict[str, Any] = {}

        for key, value in updates.items():
            safe_key = f"#attr_{key}"
            val_key = f":val_{key}"
            update_expression_parts.append(f"{safe_key} = {val_key}")
            expression_attribute_names[safe_key] = key
            expression_attribute_values[val_key] = value

        update_expression = "SET " + ", ".join(update_expression_parts)

        response = self._table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ConditionExpression=Attr("PK").exists(),
            ReturnValues="ALL_NEW",
        )
        return response["Attributes"]

    def delete_item(self, pk: str, sk: str) -> None:
        """Delete an item by primary key. Raises if item does not exist."""
        try:
            self._table.delete_item(
                Key={"PK": pk, "SK": sk},
                ConditionExpression=Attr("PK").exists(),
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise ResourceNotFoundException(f"Item PK={pk} SK={sk} not found") from e
            raise

    def query_by_pk(
        self,
        pk: str,
        sk_begins_with: str | None = None,
        limit: int | None = None,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        """Query all items sharing the same partition key.

        Args:
            pk: The partition key value.
            sk_begins_with: Optional SK prefix filter.
            limit: Maximum number of items to return.
            last_evaluated_key: Pagination token from previous call.

        Returns:
            Tuple of (items list, next pagination key or None).
        """
        kwargs: dict[str, Any] = {
            "KeyConditionExpression": Key("PK").eq(pk),
        }
        if sk_begins_with:
            kwargs["KeyConditionExpression"] = Key("PK").eq(pk) & Key("SK").begins_with(
                sk_begins_with
            )
        if limit:
            kwargs["Limit"] = limit
        if last_evaluated_key:
            kwargs["ExclusiveStartKey"] = last_evaluated_key

        response = self._table.query(**kwargs)
        return response.get("Items", []), response.get("LastEvaluatedKey")

    def query_gsi(
        self,
        index_name: str,
        pk_name: str,
        pk_value: str,
        sk_name: str | None = None,
        sk_begins_with: str | None = None,
        limit: int | None = None,
        last_evaluated_key: dict[str, Any] | None = None,
        scan_index_forward: bool = True,
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        """Query a Global Secondary Index.

        Args:
            index_name: GSI name (e.g., "GSI1").
            pk_name: GSI partition key attribute name.
            pk_value: GSI partition key value.
            sk_name: GSI sort key attribute name (optional).
            sk_begins_with: Optional prefix filter on sort key.
            limit: Maximum number of items to return.
            last_evaluated_key: Pagination token.
            scan_index_forward: False for descending order.

        Returns:
            Tuple of (items list, next pagination key or None).
        """
        key_condition = Key(pk_name).eq(pk_value)
        if sk_name and sk_begins_with:
            key_condition = key_condition & Key(sk_name).begins_with(sk_begins_with)

        kwargs: dict[str, Any] = {
            "IndexName": index_name,
            "KeyConditionExpression": key_condition,
            "ScanIndexForward": scan_index_forward,
        }
        if limit:
            kwargs["Limit"] = limit
        if last_evaluated_key:
            kwargs["ExclusiveStartKey"] = last_evaluated_key

        response = self._table.query(**kwargs)
        return response.get("Items", []), response.get("LastEvaluatedKey")

    def conditional_put_item(
        self,
        item: dict[str, Any],
        condition_expression: Any,
    ) -> bool:
        """Attempt to put an item only if condition is met.

        Returns:
            True if successful, False if condition check failed.
        """
        try:
            self._table.put_item(Item=item, ConditionExpression=condition_expression)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            raise

    def transact_write(self, transact_items: list[dict[str, Any]]) -> None:
        """Execute multiple write operations atomically."""
        self._table.meta.client.transact_write(TransactItems=transact_items)

    def update_counter(self, pk: str, sk: str, attribute: str, delta: int) -> int:
        """Atomically increment or decrement a numeric attribute.

        Args:
            pk: Partition key.
            sk: Sort key.
            attribute: Attribute name to update.
            delta: Amount to add (negative to decrement).

        Returns:
            The new value of the attribute.
        """
        response = self._table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression="ADD #attr :delta",
            ExpressionAttributeNames={"#attr": attribute},
            ExpressionAttributeValues={":delta": delta},
            ReturnValues="UPDATED_NEW",
        )
        return int(response["Attributes"][attribute])
