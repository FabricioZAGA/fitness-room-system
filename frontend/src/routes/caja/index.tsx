import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  DollarSign,
  Receipt,
  Plus,
  CheckCircle,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  useCreateCashCut,
  useCashCuts,
  useTransactionsByDate,
  useTodaySummary,
  useRecordTransaction,
} from "@/hooks/useTransactions";
import { useProducts, useSellProduct } from "@/hooks/useInventory";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CreateTransactionRequest, PaymentMethod, TransactionType } from "@/types/transaction";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/types/transaction";
import type { Product } from "@/types/inventory";

export const Route = createFileRoute("/caja/")({
  component: CajaPage,
});

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

const selectCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductSaleForm {
  product_id: string;
  quantity: number;
  payment_method: PaymentMethod;
}

// ─── Main page ────────────────────────────────────────────────────────────────

function CajaPage(): React.JSX.Element {
  const { t } = useTranslation();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [showRegister, setShowRegister] = useState(false);
  const [showCutConfirm, setShowCutConfirm] = useState(false);
  const [cutNotes, setCutNotes] = useState("");

  // Which "tab" is active in the register modal.
  // Memberships/packs are created via "Nueva membresía" (auto-records transaction here),
  // so Caja only exposes product sales and miscellaneous "other" payments.
  const [registerType, setRegisterType] = useState<TransactionType>("product");
  // Standard transaction form
  const [form, setForm] = useState<Partial<CreateTransactionRequest>>({
    payment_method: "cash",
    transaction_type: "other",
  });
  // Product sale form
  const [productForm, setProductForm] = useState<ProductSaleForm>({
    product_id: "",
    quantity: 1,
    payment_method: "cash",
  });

  const { data: summary } = useTodaySummary();
  const { data: todayTransactions = [] } = useTransactionsByDate(today);
  const { data: cashCuts = [] } = useCashCuts();
  const recordMutation = useRecordTransaction();
  const cutMutation = useCreateCashCut();

  // Product data for sell form
  const { data: products = [] } = useProducts();
  const activeProducts = products.filter((p) => p.is_active);
  const sellMutation = useSellProduct();

  // Derived product info
  const selectedProduct = activeProducts.find((p) => p.product_id === productForm.product_id) ?? null;
  const productTotal = selectedProduct ? selectedProduct.price * productForm.quantity : 0;

  // Reset product form quantity when product changes
  useEffect(() => {
    setProductForm((f) => ({ ...f, quantity: 1 }));
  }, [productForm.product_id]);

  const handleRegister = async () => {
    if (!form.amount || !form.transaction_type || !form.payment_method) return;
    await recordMutation.mutateAsync({
      transaction_type: form.transaction_type as TransactionType,
      amount: Number(form.amount),
      payment_method: form.payment_method as PaymentMethod,
      student_id: form.student_id,
      notes: form.notes,
    });
    setForm({ payment_method: "cash", transaction_type: "other" });
    setRegisterType("product");
    setShowRegister(false);
  };

  const handleSellProduct = async () => {
    if (!productForm.product_id) return;
    await sellMutation.mutateAsync({
      product_id: productForm.product_id,
      quantity: productForm.quantity,
      payment_method: productForm.payment_method,
    });
    setProductForm({ product_id: "", quantity: 1, payment_method: "cash" });
    setRegisterType("product");
    setShowRegister(false);
  };

  const handleCashCut = async () => {
    await cutMutation.mutateAsync({ cut_date: today, notes: cutNotes });
    setShowCutConfirm(false);
    setCutNotes("");
  };

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">{t("nav.caja")}</h1>
          <p className="mt-1 text-[--tx-muted]">{t("caja.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-surface] px-4 py-2.5 text-sm font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd]"
          >
            <Plus className="h-4 w-4" />
            {t("caja.registerPayment")}
          </button>
          <button
            onClick={() => setShowCutConfirm(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            <Receipt className="h-4 w-4" />
            {t("caja.cashCut")}
          </button>
        </div>
      </div>

      {/* Today's summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={DollarSign} label={t("caja.totalDay")} value={formatCurrency(summary?.grand_total ?? 0)} accent />
        <SummaryCard icon={Banknote} label={t("dashboard.cash")} value={formatCurrency(summary?.total_cash ?? 0)} />
        <SummaryCard icon={CreditCard} label={t("dashboard.card")} value={formatCurrency(summary?.total_card ?? 0)} />
        <SummaryCard icon={ArrowRightLeft} label={t("caja.transfer")} value={formatCurrency(summary?.total_transfer ?? 0)} />
      </div>

      {/* By type breakdown */}
      {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
        <div className="mb-8 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[--tx-primary]">{t("caja.byCategory")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary.by_type).map(([type, amount]) => (
              <div key={type} className="flex items-center justify-between rounded-xl bg-[--bg-muted] px-4 py-3">
                <span className="text-sm text-[--tx-muted]">
                  {TRANSACTION_TYPE_LABELS[type as TransactionType] ?? type}
                </span>
                <span className="font-semibold text-[--tx-primary]">
                  {formatCurrency(amount as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's transactions */}
      <div className="mb-8 rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
        <div className="flex items-center justify-between border-b border-[--bd-default] px-6 py-4">
          <h2 className="text-lg font-semibold text-[--tx-primary]">
            {t("caja.todayMovements", { count: todayTransactions.length })}
          </h2>
        </div>
        {todayTransactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-[--tx-muted]">{t("caja.noPayments")}</p>
        ) : (
          <div className="divide-y divide-[--bd-default]">
            {todayTransactions.map((tx) => (
              <div key={tx.transaction_id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg]">
                  <TxIcon type={tx.transaction_type} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[--tx-primary]">
                    {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                  </p>
                  <p className="text-xs text-[--tx-muted]">
                    {PAYMENT_METHOD_LABELS[tx.payment_method]}
                    {tx.notes ? ` · ${tx.notes}` : ""}
                  </p>
                </div>
                <span className="font-semibold text-[--tx-primary]">{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent cash cuts */}
      {cashCuts.length > 0 && (
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
          <div className="border-b border-[--bd-default] px-6 py-4">
            <h2 className="text-lg font-semibold text-[--tx-primary]">{t("caja.recentCuts")}</h2>
          </div>
          <div className="divide-y divide-[--bd-default]">
            {cashCuts.slice(0, 5).map((cut) => (
              <div key={cut.cut_id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg]">
                  <Receipt className="h-5 w-5 text-[--gold]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[--tx-primary]">{t("caja.cutOf")} {formatDate(cut.cut_date)}</p>
                  <p className="text-xs text-[--tx-muted]">
                    {t("caja.movements", { count: cut.transaction_count })}
                  </p>
                </div>
                <span className="font-semibold text-[--tx-primary]">{formatCurrency(cut.grand_total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Register payment modal ── */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-[--gold-bd] p-6 shadow-2xl"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <h2 className="mb-4 text-xl font-bold text-[--tx-primary]">{t("caja.registerPayment")}</h2>

            {/* Type selector tabs — memberships get auto-recorded from "Nueva Membresía" */}
            <div className="mb-5 flex rounded-xl border border-[--bd-default] bg-[--bg-muted] p-1">
              {(["product", "other"] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setRegisterType(t);
                    setForm((f) => ({ ...f, transaction_type: t }));
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                    registerType === t
                      ? "text-[--gold-fg]"
                      : "text-[--tx-muted] hover:text-[--tx-primary]"
                  }`}
                  style={
                    registerType === t
                      ? { background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)" }
                      : {}
                  }
                >
                  {TRANSACTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Product sale form */}
            {registerType === "product" ? (
              <ProductSaleFields
                form={productForm}
                products={activeProducts}
                selectedProduct={selectedProduct}
                total={productTotal}
                onChange={(patch) => setProductForm((f) => ({ ...f, ...patch }))}
              />
            ) : (
              /* Standard payment form */
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    {t("caja.amount")} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className={inputCls}
                    placeholder="0.00"
                    value={form.amount ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    {t("caja.paymentMethod")} *
                  </label>
                  <select
                    className={selectCls}
                    value={form.payment_method}
                    onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    {t("caja.notesOptional")}
                  </label>
                  <input
                    className={inputCls}
                    placeholder={t("caja.paymentNotesPlaceholder")}
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowRegister(false);
                  setRegisterType("product");
                  setForm({ payment_method: "cash", transaction_type: "other" });
                  setProductForm({ product_id: "", quantity: 1, payment_method: "cash" });
                }}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] transition-all hover:bg-[--bg-muted]"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() =>
                  void (registerType === "product" ? handleSellProduct() : handleRegister())
                }
                disabled={
                  registerType === "product"
                    ? !productForm.product_id ||
                      productForm.quantity < 1 ||
                      sellMutation.isPending
                    : !form.amount || recordMutation.isPending
                }
                className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {(registerType === "product" ? sellMutation.isPending : recordMutation.isPending)
                  ? t("common.saving")
                  : registerType === "product"
                    ? `${t("caja.sell")} ${formatCurrency(productTotal)}`
                    : t("caja.register")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash cut confirm modal */}
      {showCutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl border border-[--gold-bd] p-6 shadow-2xl"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[--gold-bg]">
              <Receipt className="h-7 w-7 text-[--gold]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[--tx-primary]">{t("caja.cashCut")}</h2>
            <p className="mb-4 text-sm text-[--tx-muted]">
              {t("caja.cutDesc", { date: formatDate(today) })}{" "}
              <span className="font-semibold text-[--tx-primary]">
                {formatCurrency(summary?.grand_total ?? 0)}
              </span>
            </p>
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                {t("caja.cutNotes")}
              </label>
              <textarea
                rows={2}
                className={inputCls}
                placeholder={t("caja.cutNotesPlaceholder")}
                value={cutNotes}
                onChange={(e) => setCutNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCutConfirm(false)}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] transition-all hover:bg-[--bg-muted]"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void handleCashCut()}
                disabled={cutMutation.isPending}
                className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {cutMutation.isPending ? t("caja.generating") : t("caja.confirmCut")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product sale fields ───────────────────────────────────────────────────────

function ProductSaleFields({
  form,
  products,
  selectedProduct,
  total,
  onChange,
}: {
  form: ProductSaleForm;
  products: Product[];
  selectedProduct: Product | null;
  total: number;
  onChange: (patch: Partial<ProductSaleForm>) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Product selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
          {t("caja.product")} *
        </label>
        <select
          className={selectCls}
          value={form.product_id}
          onChange={(e) => onChange({ product_id: e.target.value })}
        >
          <option value="">{t("caja.selectProduct")}</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id} disabled={p.stock === 0}>
              {p.name} — {formatCurrency(p.price)} ({p.stock} en stock)
            </option>
          ))}
        </select>
      </div>

      {/* Selected product info */}
      {selectedProduct && (
        <div className="rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[--tx-primary]">{selectedProduct.name}</p>
              <p className="text-xs text-[--tx-muted]">{t("caja.availableStock", { count: selectedProduct.stock })}</p>
            </div>
            <p className="text-base font-bold text-[--gold]">{formatCurrency(selectedProduct.price)} / ud</p>
          </div>
          {selectedProduct.stock <= selectedProduct.low_stock_threshold && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[--color-warning]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("caja.lowStockWarning", { count: selectedProduct.stock })}
            </div>
          )}
        </div>
      )}

      {/* Quantity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
            {t("caja.quantity")} *
          </label>
          <input
            type="number"
            min={1}
            max={selectedProduct?.stock ?? 999}
            value={form.quantity}
            onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value)) })}
            className={selectCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
            {t("caja.total")}
          </label>
          <div className="flex items-center rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3">
            <span className="text-sm font-bold text-[--gold]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
          {t("caja.paymentMethod")} *
        </label>
        <select
          className={selectCls}
          value={form.payment_method}
          onChange={(e) => onChange({ payment_method: e.target.value as PaymentMethod })}
        >
          {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-[--gold-bd] bg-[--gold-bg]" : "border-[--bd-default] bg-[--bg-surface]"}`}>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--gold-bg)" }}>
          <Icon className="h-4 w-4 text-[--gold]" />
        </div>
        <span className="text-sm text-[--tx-muted]">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-[--gold]" : "text-[--tx-primary]"}`}>{value}</p>
    </div>
  );
}

function TxIcon({ type }: { type: string }): React.JSX.Element {
  const cls = "h-5 w-5 text-[--gold]";
  switch (type) {
    case "membership": return <Users className={cls} />;
    case "class_pack": return <CheckCircle className={cls} />;
    case "product": return <Package className={cls} />;
    default: return <ShoppingBag className={cls} />;
  }
}
