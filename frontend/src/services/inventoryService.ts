/** Inventory API service. */

import type {
  CreateProductRequest,
  CreateSaleRequest,
  Product,
  ProductSale,
  UpdateProductRequest,
} from "@/types/inventory";
import { apiClient } from "./apiClient";

export const inventoryService = {
  async createProduct(data: CreateProductRequest): Promise<Product> {
    const res = await apiClient.post<Product>("/inventory/products", data);
    return res.data;
  },

  async listProducts(category?: string): Promise<Product[]> {
    const res = await apiClient.get<Product[]>("/inventory/products", {
      params: category ? { category } : undefined,
    });
    return res.data;
  },

  async getProduct(productId: string): Promise<Product> {
    const res = await apiClient.get<Product>(`/inventory/products/${productId}`);
    return res.data;
  },

  async updateProduct(productId: string, data: UpdateProductRequest): Promise<Product> {
    const res = await apiClient.patch<Product>(
      `/inventory/products/${productId}`,
      data
    );
    return res.data;
  },

  async restock(productId: string, quantity: number): Promise<Product> {
    const res = await apiClient.post<Product>(
      `/inventory/products/${productId}/restock`,
      null,
      { params: { quantity } }
    );
    return res.data;
  },

  async getLowStock(): Promise<Product[]> {
    const res = await apiClient.get<Product[]>("/inventory/products/low-stock");
    return res.data;
  },

  async sellProduct(data: CreateSaleRequest): Promise<ProductSale> {
    const res = await apiClient.post<ProductSale>("/inventory/sales", data);
    return res.data;
  },

  async listSalesByDate(date?: string): Promise<ProductSale[]> {
    const res = await apiClient.get<ProductSale[]>("/inventory/sales", {
      params: date ? { date } : undefined,
    });
    return res.data;
  },
} as const;
