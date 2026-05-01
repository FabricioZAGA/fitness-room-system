"""Inventory router — endpoints for products and sales."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from src.models.inventory import (
    ProductCreate,
    ProductResponse,
    ProductSaleCreate,
    ProductSaleResponse,
    ProductUpdate,
)
from src.services.inventory_service import InventoryService
from src.utils.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def get_service() -> InventoryService:
    return InventoryService()


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Product",
    description="Add a new product to the inventory.",
)
def create_product(
    data: ProductCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> ProductResponse:
    return service.create_product(data)


@router.get(
    "/products",
    response_model=list[ProductResponse],
    summary="List Products",
    description="List all active products, optionally filtered by category.",
)
def list_products(
    category: str | None = Query(default=None, description="Filter by product category"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> list[ProductResponse]:
    items, _ = service.list_products(category=category)
    return items


@router.get(
    "/products/low-stock",
    response_model=list[ProductResponse],
    summary="Low Stock Alert",
    description="List all products at or below their low-stock threshold.",
)
def low_stock_alert(
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> list[ProductResponse]:
    return service.get_low_stock()


@router.post(
    "/products/low-stock/notify",
    summary="Send Low Stock Alert Emails",
    description=(
        "Send the low-stock alert email to every admin for each product "
        "currently at or below its threshold. Returns a per-product summary."
    ),
)
def notify_low_stock(
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> dict[str, Any]:
    return service.notify_low_stock()


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Get Product",
)
def get_product(
    product_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> ProductResponse:
    return service.get_product(product_id)


@router.patch(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Update Product",
    description="Update product details such as price, stock, or description.",
)
def update_product(
    product_id: str,
    data: ProductUpdate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> ProductResponse:
    return service.update_product(product_id, data)


@router.post(
    "/products/{product_id}/restock",
    response_model=ProductResponse,
    summary="Restock Product",
    description="Add units to an existing product's stock.",
)
def restock_product(
    product_id: str,
    quantity: int = Query(..., ge=1, description="Units to add"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> ProductResponse:
    return service.restock(product_id, quantity)


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------

@router.post(
    "/sales",
    response_model=ProductSaleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sell Product",
    description=(
        "Record a product sale. Decrements stock atomically "
        "and creates a matching Transaction record."
    ),
)
def sell_product(
    data: ProductSaleCreate,
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> ProductSaleResponse:
    return service.sell_product(data)


@router.get(
    "/sales",
    response_model=list[ProductSaleResponse],
    summary="List Sales by Date",
    description="List all product sales for a given date. Defaults to today.",
)
def list_sales(
    date: str | None = Query(default=None, description="Date filter YYYY-MM-DD (default: today)"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    service: InventoryService = Depends(get_service),
) -> list[ProductSaleResponse]:
    from datetime import date as dt_date
    date_str = date or dt_date.today().isoformat()
    items, _ = service.list_sales_by_date(date_str)
    return items
