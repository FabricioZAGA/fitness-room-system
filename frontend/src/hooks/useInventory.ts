/** TanStack Query hooks for the Inventory module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  CreateProductRequest,
  CreateSaleRequest,
  Product,
  ProductSale,
  UpdateProductRequest,
} from "@/types/inventory";
import { inventoryService } from "@/services/inventoryService";

export const PRODUCT_KEY = "products";
export const SALE_KEY = "product-sales";

export function useProducts(category?: string): UseQueryResult<Product[]> {
  return useQuery({
    queryKey: [PRODUCT_KEY, "list", category],
    queryFn: () => inventoryService.listProducts(category),
  });
}

export function useProduct(productId: string): UseQueryResult<Product> {
  return useQuery({
    queryKey: [PRODUCT_KEY, productId],
    queryFn: () => inventoryService.getProduct(productId),
    enabled: !!productId,
  });
}

export function useLowStockProducts(): UseQueryResult<Product[]> {
  return useQuery({
    queryKey: [PRODUCT_KEY, "low-stock"],
    queryFn: () => inventoryService.getLowStock(),
    refetchInterval: 1000 * 60 * 10,
  });
}

export function useSalesByDate(date?: string): UseQueryResult<ProductSale[]> {
  return useQuery({
    queryKey: [SALE_KEY, "byDate", date],
    queryFn: () => inventoryService.listSalesByDate(date),
  });
}

export function useCreateProduct(): UseMutationResult<
  Product,
  Error,
  CreateProductRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => inventoryService.createProduct(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  Product,
  Error,
  { productId: string; data: UpdateProductRequest }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }) => inventoryService.updateProduct(productId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
    },
  });
}

export function useRestock(): UseMutationResult<
  Product,
  Error,
  { productId: string; quantity: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }) =>
      inventoryService.restock(productId, quantity),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
    },
  });
}

export function useSellProduct(): UseMutationResult<
  ProductSale,
  Error,
  CreateSaleRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => inventoryService.sellProduct(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
      void qc.invalidateQueries({ queryKey: [SALE_KEY] });
    },
  });
}
