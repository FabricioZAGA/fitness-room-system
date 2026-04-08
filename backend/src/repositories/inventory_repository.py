"""Inventory repository — DynamoDB access patterns for Products and Sales."""

from typing import Any

from src.models.common import utc_now
from src.models.inventory import (
    ProductCreate,
    ProductDynamoItem,
    ProductSaleCreate,
    ProductSaleDynamoItem,
    ProductUpdate,
)
from src.repositories.dynamo_repository import DynamoRepository
from src.utils.exceptions import ResourceNotFoundException


class InventoryRepository(DynamoRepository):
    """Repository for Product and ProductSale access patterns."""

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def create_product(self, data: ProductCreate) -> ProductDynamoItem:
        """Create a new inventory product."""
        item = ProductDynamoItem.from_create(data)
        self.put_item(item.model_dump(mode="json"))
        return item

    def get_product(self, product_id: str) -> ProductDynamoItem:
        """Get a product by ID."""
        raw = self.get_item(f"PRODUCT#{product_id}", "METADATA")
        if raw is None:
            raise ResourceNotFoundException(f"Product '{product_id}' not found")
        return ProductDynamoItem.model_validate(raw)

    def list_products(
        self,
        category: str | None = None,
        limit: int = 100,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ProductDynamoItem], dict[str, Any] | None]:
        """List all products, optionally filtered by category.

        Access pattern: GSI1 PK=PRODUCTS, SK begins_with CATEGORY#{cat} | CATEGORY#.
        """
        sk_prefix = f"CATEGORY#{category}#" if category else "CATEGORY#"
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="PRODUCTS",
            sk_name="GSI1SK",
            sk_begins_with=sk_prefix,
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [ProductDynamoItem.model_validate(i) for i in items], next_key

    def update_product(
        self, product_id: str, data: ProductUpdate
    ) -> ProductDynamoItem:
        """Update product attributes."""
        updates: dict[str, Any] = {"updated_at": utc_now().isoformat()}

        if data.name is not None:
            updates["name"] = data.name
        if data.category is not None:
            updates["category"] = data.category.value
        if data.description is not None:
            updates["description"] = data.description
        if data.price is not None:
            updates["price"] = str(data.price)
        if data.stock is not None:
            updates["stock"] = data.stock
        if data.low_stock_threshold is not None:
            updates["low_stock_threshold"] = data.low_stock_threshold
        if data.sku is not None:
            updates["sku"] = data.sku
        if data.is_active is not None:
            updates["is_active"] = data.is_active

        raw = self.update_item(f"PRODUCT#{product_id}", "METADATA", updates)
        return ProductDynamoItem.model_validate(raw)

    def decrement_stock(self, product_id: str, quantity: int = 1) -> int:
        """Atomically decrement stock. Returns new stock count."""
        return self.update_counter(
            pk=f"PRODUCT#{product_id}",
            sk="METADATA",
            attribute="stock",
            delta=-quantity,
        )

    def increment_stock(self, product_id: str, quantity: int = 1) -> int:
        """Atomically increment stock (restocking). Returns new count."""
        return self.update_counter(
            pk=f"PRODUCT#{product_id}",
            sk="METADATA",
            attribute="stock",
            delta=quantity,
        )

    # ------------------------------------------------------------------
    # Sales
    # ------------------------------------------------------------------

    def create_sale(
        self, data: ProductSaleCreate, unit_price: float
    ) -> ProductSaleDynamoItem:
        """Record a product sale.

        Access pattern: PUT PK=PRODUCT#{id}, SK=SALE#{timestamp}#{sale_id}.
        """
        item = ProductSaleDynamoItem.from_create(data, unit_price)
        self.put_item(item.model_dump(mode="json"))
        return item

    def list_sales_by_product(
        self,
        product_id: str,
        limit: int = 50,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ProductSaleDynamoItem], dict[str, Any] | None]:
        """List sales for a specific product.

        Access pattern: QUERY PK=PRODUCT#{id}, SK begins_with SALE#.
        """
        items, next_key = self.query_by_pk(
            pk=f"PRODUCT#{product_id}",
            sk_begins_with="SALE#",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [ProductSaleDynamoItem.model_validate(i) for i in items], next_key

    def list_sales_by_date(
        self,
        date_str: str,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ProductSaleDynamoItem], dict[str, Any] | None]:
        """List all sales for a specific date.

        Access pattern: GSI1 PK=SALES, SK begins_with DATE#{date}.
        """
        items, next_key = self.query_gsi(
            index_name="GSI1",
            pk_name="GSI1PK",
            pk_value="SALES",
            sk_name="GSI1SK",
            sk_begins_with=f"DATE#{date_str}",
            limit=limit,
            last_evaluated_key=last_evaluated_key,
        )
        return [ProductSaleDynamoItem.model_validate(i) for i in items], next_key
