/** TypeScript types for Inventory (Products and Sales). */

export type ProductCategory =
  | "supplement"
  | "beverage"
  | "apparel"
  | "equipment"
  | "other";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  supplement: "Suplemento",
  beverage: "Bebida",
  apparel: "Ropa/Accesorios",
  equipment: "Equipo",
  other: "Otro",
};

export interface Product {
  product_id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  price: number;
  stock: number;
  low_stock_threshold: number;
  sku: string | null;
  is_active: boolean;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  category?: ProductCategory;
  description?: string;
  price: number;
  stock: number;
  low_stock_threshold?: number;
  sku?: string;
}

export interface UpdateProductRequest {
  name?: string;
  category?: ProductCategory;
  description?: string;
  price?: number;
  stock?: number;
  low_stock_threshold?: number;
  sku?: string;
  is_active?: boolean;
}

export interface ProductSale {
  sale_id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  student_id: string | null;
  payment_method: string;
  notes: string | null;
  sale_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleRequest {
  product_id: string;
  quantity?: number;
  student_id?: string;
  payment_method: string;
  notes?: string;
}
