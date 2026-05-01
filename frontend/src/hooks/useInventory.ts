/** TanStack Query hooks for the Inventory module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateProductRequest,
  CreateSaleRequest,
  Product,
  ProductSale,
  UpdateProductRequest,
} from "@/types/inventory";
import { inventoryService } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/lib/apiError";

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
      toast.success("Producto creado");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No pudimos crear el producto."));
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
      toast.success("Producto actualizado");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No pudimos actualizar el producto."));
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
      toast.success("Stock reabastecido");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No pudimos reabastecer el producto."));
    },
  });
}

export function useNotifyLowStock(): UseMutationResult<
  { total_products: number; emails_sent: number; products_failed: number },
  Error,
  void
> {
  return useMutation({
    mutationFn: () => inventoryService.notifyLowStock(),
    onSuccess: (data) => {
      if (data.total_products === 0) {
        toast.success("No hay productos con stock bajo — todo bien.");
        return;
      }
      toast.success(
        `Alertas enviadas: ${data.emails_sent} correos para ${data.total_products} producto(s).`,
      );
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "No pudimos enviar las alertas de stock bajo."));
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
    onSuccess: (sale) => {
      void qc.invalidateQueries({ queryKey: [PRODUCT_KEY] });
      void qc.invalidateQueries({ queryKey: [SALE_KEY] });
      // Backend auto-creates a transaction — sync Caja view
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`Venta registrada — ${sale.product_name ?? "Producto"} x${sale.quantity}`);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Error al registrar la venta."));
    },
  });
}
