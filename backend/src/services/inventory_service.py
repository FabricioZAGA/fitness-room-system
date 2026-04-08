"""Inventory service — business logic for products and sales."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.inventory import (
    ProductCategory,
    ProductCreate,
    ProductResponse,
    ProductSaleCreate,
    ProductSaleResponse,
    ProductUpdate,
)
from src.models.transaction import PaymentMethod, TransactionCreate, TransactionType
from src.repositories.inventory_repository import InventoryRepository
from src.repositories.transaction_repository import TransactionRepository
from src.utils.exceptions import InvalidOperationException

logger = Logger()


class InventoryService:
    """Service for inventory product and sale operations."""

    def __init__(
        self,
        inventory_repo: InventoryRepository | None = None,
        transaction_repo: TransactionRepository | None = None,
    ) -> None:
        self._inventory = inventory_repo or InventoryRepository()
        self._transactions = transaction_repo or TransactionRepository()

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def create_product(self, data: ProductCreate) -> ProductResponse:
        """Create a new product in the inventory."""
        logger.info("Creating product", extra={"name": data.name})
        item = self._inventory.create_product(data)
        return item.to_response()

    def get_product(self, product_id: str) -> ProductResponse:
        """Get a product by ID."""
        return self._inventory.get_product(product_id).to_response()

    def list_products(
        self,
        category: str | None = None,
        limit: int = 100,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ProductResponse], dict[str, Any] | None]:
        """List products, optionally filtered by category."""
        items, next_key = self._inventory.list_products(
            category=category, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def update_product(self, product_id: str, data: ProductUpdate) -> ProductResponse:
        """Update product details."""
        logger.info("Updating product", extra={"product_id": product_id})
        item = self._inventory.update_product(product_id, data)
        return item.to_response()

    def restock(self, product_id: str, quantity: int) -> ProductResponse:
        """Add stock to an existing product."""
        logger.info("Restocking product", extra={"product_id": product_id, "qty": quantity})
        new_stock = self._inventory.increment_stock(product_id, quantity)
        product = self._inventory.get_product(product_id)
        product.stock = new_stock
        return product.to_response()

    def get_low_stock(self) -> list[ProductResponse]:
        """Return all active products that are at or below their low-stock threshold."""
        items, _ = self._inventory.list_products(limit=500)
        return [
            i.to_response()
            for i in items
            if i.is_active and i.stock <= i.low_stock_threshold
        ]

    # ------------------------------------------------------------------
    # Sales
    # ------------------------------------------------------------------

    def sell_product(self, data: ProductSaleCreate) -> ProductSaleResponse:
        """Record a product sale.

        Steps:
        1. Fetch product to get current price and verify active status.
        2. Check sufficient stock.
        3. Decrement stock atomically.
        4. Record the sale.
        5. Create a matching Transaction record.
        """
        product = self._inventory.get_product(data.product_id)

        if not product.is_active:
            raise InvalidOperationException(
                f"Product '{product.product_id}' is not active and cannot be sold"
            )
        if product.stock < data.quantity:
            raise InvalidOperationException(
                f"Insufficient stock: requested {data.quantity}, available {product.stock}"
            )

        # Decrement stock atomically
        self._inventory.decrement_stock(data.product_id, data.quantity)

        # Record the sale
        sale_item = self._inventory.create_sale(data, unit_price=product.price)

        # Create matching transaction
        try:
            payment_method = PaymentMethod(data.payment_method)
        except ValueError:
            payment_method = PaymentMethod.CASH

        self._transactions.create_transaction(
            TransactionCreate(
                student_id=data.student_id,
                transaction_type=TransactionType.PRODUCT,
                amount=sale_item.total_amount,
                payment_method=payment_method,
                reference_id=sale_item.sale_id,
                notes=f"Venta: {product.name} x{data.quantity}",
            )
        )

        return sale_item.to_response(product_name=product.name)

    def list_sales_by_date(
        self,
        date_str: str,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[ProductSaleResponse], dict[str, Any] | None]:
        """List all product sales for a given date."""
        items, next_key = self._inventory.list_sales_by_date(
            date_str, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key
