"""Pydantic v2 models for Inventory entities.

Products are items sold at the gym (supplements, water, towels, etc.).
Each sale decrements the stock and creates a TransactionType.PRODUCT transaction.

DynamoDB key patterns:

Product:
  PK: PRODUCT#{product_id}
  SK: METADATA
  GSI1PK: PRODUCTS
  GSI1SK: CATEGORY#{category}#{name}   — list all products optionally filtered by category

ProductSale:
  PK: PRODUCT#{product_id}
  SK: SALE#{timestamp}#{sale_id}       — list sales per product
  GSI1PK: SALES
  GSI1SK: DATE#{date}#{sale_id}        — list all sales by date
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from src.models.common import TimestampedModel, new_id, utc_now


class ProductCategory(StrEnum):
    """Categories for inventory items."""

    SUPPLEMENT = "supplement"      # Proteína, creatina, etc.
    BEVERAGE = "beverage"          # Agua, bebida energética
    APPAREL = "apparel"            # Ropa, accesorios
    EQUIPMENT = "equipment"        # Ligas, guantes, etc.
    OTHER = "other"


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    """Create a new inventory product."""

    name: str = Field(..., min_length=2, max_length=100)
    category: ProductCategory = Field(default=ProductCategory.OTHER)
    description: str | None = Field(default=None, max_length=500)
    price: float = Field(..., gt=0, description="Sale price in MXN")
    stock: int = Field(..., ge=0, description="Current stock quantity")
    low_stock_threshold: int = Field(
        default=5,
        ge=0,
        description="Alert when stock falls below this number",
    )
    sku: str | None = Field(default=None, max_length=50, description="Internal code")


class ProductUpdate(BaseModel):
    """Partial update for an inventory product."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    category: ProductCategory | None = None
    description: str | None = Field(default=None, max_length=500)
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    sku: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class ProductResponse(TimestampedModel):
    """Product schema returned in API responses."""

    product_id: str
    name: str
    category: ProductCategory
    description: str | None
    price: float
    stock: int
    low_stock_threshold: int
    sku: str | None
    is_active: bool
    is_low_stock: bool = False

    def model_post_init(self, __context: object) -> None:
        self.is_low_stock = self.stock <= self.low_stock_threshold


class ProductDynamoItem(BaseModel):
    """DynamoDB item for a product."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "PRODUCT"
    product_id: str
    name: str
    category: str
    description: str | None
    price: float
    stock: int
    low_stock_threshold: int
    sku: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(cls, data: ProductCreate) -> "ProductDynamoItem":
        product_id = new_id()
        now = utc_now()
        return cls(
            PK=f"PRODUCT#{product_id}",
            SK="METADATA",
            GSI1PK="PRODUCTS",
            GSI1SK=f"CATEGORY#{data.category.value}#{data.name.lower()}",
            product_id=product_id,
            name=data.name,
            category=data.category.value,
            description=data.description,
            price=data.price,
            stock=data.stock,
            low_stock_threshold=data.low_stock_threshold,
            sku=data.sku,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

    def to_response(self) -> ProductResponse:
        return ProductResponse(
            product_id=self.product_id,
            name=self.name,
            category=ProductCategory(self.category),
            description=self.description,
            price=self.price,
            stock=self.stock,
            low_stock_threshold=self.low_stock_threshold,
            sku=self.sku,
            is_active=self.is_active,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


# ---------------------------------------------------------------------------
# ProductSale
# ---------------------------------------------------------------------------

class ProductSaleCreate(BaseModel):
    """Record the sale of a product."""

    product_id: str = Field(..., description="Product being sold")
    quantity: int = Field(default=1, ge=1, description="Number of units sold")
    student_id: str | None = Field(default=None, description="Buyer if a gym member")
    payment_method: str = Field(..., description="cash | card | transfer")
    notes: str | None = Field(default=None, max_length=500)


class ProductSaleResponse(TimestampedModel):
    """Sale record returned in API responses."""

    sale_id: str
    product_id: str
    product_name: str | None = None
    quantity: int
    unit_price: float
    total_amount: float
    student_id: str | None
    payment_method: str
    notes: str | None
    sale_date: str


class ProductSaleDynamoItem(BaseModel):
    """DynamoDB item for a product sale."""

    PK: str
    SK: str
    GSI1PK: str
    GSI1SK: str
    EntityType: str = "PRODUCT_SALE"
    sale_id: str
    product_id: str
    quantity: int
    unit_price: float
    total_amount: float
    student_id: str | None
    payment_method: str
    notes: str | None
    sale_date: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_create(
        cls,
        data: ProductSaleCreate,
        unit_price: float,
    ) -> "ProductSaleDynamoItem":
        sale_id = new_id()
        now = utc_now()
        sale_date = now.date().isoformat()
        total = unit_price * data.quantity

        return cls(
            PK=f"PRODUCT#{data.product_id}",
            SK=f"SALE#{now.isoformat()}#{sale_id}",
            GSI1PK="SALES",
            GSI1SK=f"DATE#{sale_date}#{sale_id}",
            sale_id=sale_id,
            product_id=data.product_id,
            quantity=data.quantity,
            unit_price=unit_price,
            total_amount=total,
            student_id=data.student_id,
            payment_method=data.payment_method,
            notes=data.notes,
            sale_date=sale_date,
            created_at=now,
            updated_at=now,
        )

    def to_response(self, product_name: str | None = None) -> ProductSaleResponse:
        return ProductSaleResponse(
            sale_id=self.sale_id,
            product_id=self.product_id,
            product_name=product_name,
            quantity=self.quantity,
            unit_price=self.unit_price,
            total_amount=self.total_amount,
            student_id=self.student_id,
            payment_method=self.payment_method,
            notes=self.notes,
            sale_date=self.sale_date,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
