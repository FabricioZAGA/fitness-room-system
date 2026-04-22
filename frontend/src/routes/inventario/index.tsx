import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  Plus,
  AlertTriangle,
  ShoppingCart,
  ArrowUpCircle,
  Search,
} from "lucide-react";
import {
  useProducts,
  useCreateProduct,
  useSellProduct,
  useRestock,
  useUpdateProduct,
} from "@/hooks/useInventory";
import { formatCurrency } from "@/lib/utils";
import type {
  CreateProductRequest,
  CreateSaleRequest,
  Product,
  ProductCategory,
} from "@/types/inventory";
import { PRODUCT_CATEGORY_LABELS } from "@/types/inventory";
import { PAYMENT_METHOD_LABELS } from "@/types/transaction";


export const Route = createFileRoute("/inventario/")({
  component: InventarioPage,
});

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

const selectCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

function InventarioPage(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [sellProduct, setSellProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [createForm, setCreateForm] = useState<Partial<CreateProductRequest>>({
    category: "other",
    stock: 0,
    low_stock_threshold: 5,
  });
  const [sellForm, setSellForm] = useState<Partial<CreateSaleRequest>>({
    quantity: 1,
    payment_method: "cash",
  });

  const { data: products = [], isLoading } = useProducts(filterCategory || undefined);
  const createMutation = useCreateProduct();
  const sellMutation = useSellProduct();
  const restockMutation = useRestock();
  const updateMutation = useUpdateProduct();

  const filtered = products.filter((p) =>
    search
      ? p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
      : true
  );

  const lowStock = filtered.filter((p) => p.is_low_stock && p.is_active);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.price) return;
    await createMutation.mutateAsync(createForm as CreateProductRequest);
    setCreateForm({ category: "other", stock: 0, low_stock_threshold: 5 });
    setShowCreate(false);
  };

  const handleSell = async () => {
    if (!sellProduct || !sellForm.payment_method) return;
    await sellMutation.mutateAsync({
      product_id: sellProduct.product_id,
      quantity: sellForm.quantity ?? 1,
      payment_method: sellForm.payment_method,
      notes: sellForm.notes,
    });
    setSellProduct(null);
    setSellForm({ quantity: 1, payment_method: "cash" });
  };

  const handleRestock = async () => {
    if (!restockProduct) return;
    await restockMutation.mutateAsync({
      productId: restockProduct.product_id,
      quantity: restockQty,
    });
    setRestockProduct(null);
    setRestockQty(1);
  };

  const handleToggleActive = async (product: Product) => {
    await updateMutation.mutateAsync({
      productId: product.product_id,
      data: { is_active: !product.is_active },
    });
  };

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">Inventario</h1>
          <p className="mt-1 text-[--tx-muted]">Productos y ventas del Studio</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            color: "var(--gold-fg)",
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[--color-warning-bd] bg-[--color-warning-bg] p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[--color-warning] mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[--color-warning]">
              {lowStock.length} producto{lowStock.length !== 1 ? "s" : ""} con stock bajo
            </p>
            <p className="text-sm text-[--tx-muted]">
              {lowStock.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[--tx-disabled]" />
          <input
            className="w-full rounded-xl border border-[--bd-default] bg-[--bg-surface] py-3 pl-11 pr-4 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-[--bd-default] bg-[--bg-surface] px-4 py-3 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(PRODUCT_CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Productos Activos" value={products.filter((p) => p.is_active).length} />
        <StatCard label="Con Stock Bajo" value={lowStock.length} warning={lowStock.length > 0} />
        <StatCard
          label="Sin Stock"
          value={products.filter((p) => p.stock === 0 && p.is_active).length}
        />
      </div>

      {/* Product list */}
      <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
        <div className="border-b border-[--bd-default] px-6 py-4">
          <h2 className="text-lg font-semibold text-[--tx-primary]">
            Productos ({filtered.length})
          </h2>
        </div>

        {isLoading ? (
          <p className="px-6 py-10 text-center text-[--tx-muted]">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Package className="h-12 w-12 text-[--tx-disabled]" />
            <p className="text-[--tx-muted]">No hay productos registrados</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              Agregar primer producto
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[--bd-default]">
            {filtered.map((product) => (
              <ProductRow
                key={product.product_id}
                product={product}
                onSell={() => setSellProduct(product)}
                onRestock={() => setRestockProduct(product)}
                onToggleActive={() => void handleToggleActive(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create product modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[--gold-bd] p-6 shadow-2xl" style={{ backgroundColor: "var(--bg-elevated)" }}>
            <h2 className="mb-6 text-xl font-bold text-[--tx-primary]">Nuevo Producto</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Nombre *
                </label>
                <input
                  className={inputCls}
                  placeholder="Proteína Whey, Agua, etc."
                  value={createForm.name ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    Precio (MXN) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    placeholder="0.00"
                    value={createForm.price ?? ""}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, price: parseFloat(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    Stock inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={createForm.stock ?? 0}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, stock: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    Categoría
                  </label>
                  <select
                    className={selectCls}
                    value={createForm.category}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        category: e.target.value as ProductCategory,
                      }))
                    }
                  >
                    {Object.entries(PRODUCT_CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    Alerta stock bajo
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={createForm.low_stock_threshold ?? 5}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        low_stock_threshold: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Código / SKU (opcional)
                </label>
                <input
                  className={inputCls}
                  placeholder="WP-500g"
                  value={createForm.sku ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] hover:bg-[--bg-muted]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={!createForm.name || !createForm.price || createMutation.isPending}
                className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {createMutation.isPending ? "Guardando..." : "Crear Producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell modal */}
      {sellProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[--gold-bd] p-6 shadow-2xl" style={{ backgroundColor: "var(--bg-elevated)" }}>
            <h2 className="mb-1 text-xl font-bold text-[--tx-primary]">Vender</h2>
            <p className="mb-6 text-[--tx-muted]">{sellProduct.name}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Cantidad (disponible: {sellProduct.stock})
                </label>
                <input
                  type="number"
                  min="1"
                  max={sellProduct.stock}
                  className={inputCls}
                  value={sellForm.quantity ?? 1}
                  onChange={(e) =>
                    setSellForm((f) => ({ ...f, quantity: parseInt(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Método de pago *
                </label>
                <select
                  className={selectCls}
                  value={sellForm.payment_method}
                  onChange={(e) =>
                    setSellForm((f) => ({ ...f, payment_method: e.target.value }))
                  }
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl bg-[--gold-bg] px-4 py-3">
                <p className="text-sm text-[--tx-muted]">Total a cobrar</p>
                <p className="text-xl font-bold text-[--gold]">
                  {formatCurrency(sellProduct.price * (sellForm.quantity ?? 1))}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSellProduct(null)}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] hover:bg-[--bg-muted]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSell()}
                disabled={sellMutation.isPending}
                className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {sellMutation.isPending ? "Procesando..." : "Confirmar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[--gold-bd] p-6 shadow-2xl" style={{ backgroundColor: "var(--bg-elevated)" }}>
            <h2 className="mb-1 text-xl font-bold text-[--tx-primary]">Reabastecer</h2>
            <p className="mb-6 text-[--tx-muted]">
              {restockProduct.name} — Stock actual: {restockProduct.stock}
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                Unidades a agregar
              </label>
              <input
                type="number"
                min="1"
                className={inputCls}
                value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value))}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setRestockProduct(null)}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] hover:bg-[--bg-muted]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleRestock()}
                disabled={restockMutation.isPending}
                className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {restockMutation.isPending ? "Guardando..." : "Agregar Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  onSell,
  onRestock,
  onToggleActive,
}: {
  product: Product;
  onSell: () => void;
  onRestock: () => void;
  onToggleActive: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg]">
        <Package className="h-5 w-5 text-[--gold]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[--tx-primary]">{product.name}</p>
          {product.is_low_stock && product.is_active && (
            <span className="rounded-full bg-[--color-warning-bg] px-2 py-0.5 text-xs font-medium text-[--color-warning]">
              Stock bajo
            </span>
          )}
          {!product.is_active && (
            <span className="rounded-full bg-[--bg-muted] px-2 py-0.5 text-xs text-[--tx-disabled]">
              Inactivo
            </span>
          )}
        </div>
        <p className="text-xs text-[--tx-muted]">
          {PRODUCT_CATEGORY_LABELS[product.category]} · Stock: {product.stock}
          {product.sku ? ` · SKU: ${product.sku}` : ""}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-[--tx-primary]">
        {formatCurrency(product.price)}
      </p>
      <div className="flex shrink-0 gap-2">
        {product.is_active && product.stock > 0 && (
          <button
            onClick={onSell}
            className="flex items-center gap-1 rounded-xl border border-[--bd-default] px-3 py-1.5 text-xs font-medium text-[--tx-muted] hover:border-[--gold-bd] hover:text-[--gold] transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Vender
          </button>
        )}
        <button
          onClick={onRestock}
          className="flex items-center gap-1 rounded-xl border border-[--bd-default] px-3 py-1.5 text-xs font-medium text-[--tx-muted] hover:border-[--gold-bd] hover:text-[--gold] transition-colors"
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Reabastecer
        </button>
        <button
          onClick={onToggleActive}
          className="rounded-xl border border-[--bd-default] px-3 py-1.5 text-xs font-medium text-[--tx-disabled] hover:text-[--tx-muted] transition-colors"
        >
          {product.is_active ? "Desact." : "Activar"}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        warning && value > 0
          ? "border-[--color-warning-bd] bg-[--color-warning-bg]"
          : "border-[--bd-default] bg-[--bg-surface]"
      }`}
    >
      <p
        className={`text-3xl font-bold ${
          warning && value > 0 ? "text-[--color-warning]" : "text-[--tx-primary]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-[--tx-muted]">{label}</p>
    </div>
  );
}
