import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  FileText,
  Wallet,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  useCreateCashCut,
  useCashCuts,
  useOpenPeriod,
  useRegisterCharge,
  useDeleteTransaction,
} from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { EditTransactionModal } from "@/components/shared/EditTransactionModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useProducts, useSellProduct } from "@/hooks/useInventory";
import { useDeposit } from "@/hooks/useBalance";
import { useAllPendingDebts } from "@/hooks/useDebts";
import { useStudents } from "@/hooks/useStudents";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  EMPTY_CHARGE_PAYMENT,
  chargeError,
  chargePayload,
  type ChargePaymentValue,
} from "@/lib/charge";
import { ChargePaymentSection } from "@/components/shared/ChargePaymentSection";
import type { PaymentMethod, Transaction, TransactionType } from "@/types/transaction";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS, describePayment } from "@/types/transaction";
import type { Product } from "@/types/inventory";
import type { Student } from "@/types/student";
import { transactionService } from "@/services/transactionService";
import { useGymStore } from "@/store/useGymStore";

const loadExportReports = (): Promise<typeof import("@/lib/exportReports")> =>
  import("@/lib/exportReports");

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
}

const EMPTY_PRODUCT_FORM: ProductSaleForm = { product_id: "", quantity: 1 };

interface OtherChargeForm {
  amount: number;
  notes: string;
}

const EMPTY_OTHER_FORM: OtherChargeForm = { amount: 0, notes: "" };

interface DepositForm {
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string;
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
  const [registerType, setRegisterType] = useState<"product" | "other" | "deposit">("product");
  // "Other" charge form
  const [form, setForm] = useState<OtherChargeForm>(EMPTY_OTHER_FORM);
  const [otherPayment, setOtherPayment] = useState<ChargePaymentValue>(EMPTY_CHARGE_PAYMENT);
  // Product sale form
  const [productForm, setProductForm] = useState<ProductSaleForm>(EMPTY_PRODUCT_FORM);
  const [productPayment, setProductPayment] = useState<ChargePaymentValue>(EMPTY_CHARGE_PAYMENT);
  const patchProductPayment = useCallback(
    (patch: Partial<ChargePaymentValue>) => setProductPayment((v) => ({ ...v, ...patch })),
    [],
  );
  const patchOtherPayment = useCallback(
    (patch: Partial<ChargePaymentValue>) => setOtherPayment((v) => ({ ...v, ...patch })),
    [],
  );
  // Deposit form
  const [depositForm, setDepositForm] = useState<DepositForm>({
    student_id: "",
    amount: 0,
    payment_method: "cash",
    notes: "",
  });

  const { isAdmin } = useAuth();
  const gymName = useGymStore((s) => s.name);

  // Admin edit/delete state
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const deleteMutation = useDeleteTransaction();
  // Open period = everything since the last cash cut, across days. The register
  // only resets to zero when a cut is made (not at midnight).
  const { data: summary } = useOpenPeriod();
  const openTransactions = summary?.transactions ?? [];
  const lastCutAt = summary?.last_cut_at ? new Date(summary.last_cut_at) : null;
  const lastCutTime = lastCutAt
    ? lastCutAt.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Mexico_City",
      })
    : null;
  const { data: cashCuts = [] } = useCashCuts();
  const recordMutation = useRegisterCharge();
  const cutMutation = useCreateCashCut();

  // Product data for sell form
  const { data: products = [] } = useProducts();
  const activeProducts = products.filter((p) => p.is_active);
  const sellMutation = useSellProduct();

  // Students for deposit and pending sale
  const { data: studentsData } = useStudents({ limit: 500 });
  const allStudents = studentsData?.items ?? [];
  const studentNames = Object.fromEntries(allStudents.map((s) => [s.student_id, s.full_name]));
  const { data: pendingDebts = [] } = useAllPendingDebts();
  const depositMutation = useDeposit();

  // Derived product info
  const selectedProduct = activeProducts.find((p) => p.product_id === productForm.product_id) ?? null;
  const productTotal = selectedProduct ? selectedProduct.price * productForm.quantity : 0;

  // Reset product form quantity when product changes
  useEffect(() => {
    setProductForm((f) => ({ ...f, quantity: 1 }));
  }, [productForm.product_id]);

  const otherAmount = Number(form.amount) || 0;
  const otherPaymentReady = otherAmount > 0 && chargeError(otherPayment, otherAmount) === null;
  const productPaymentReady = chargeError(productPayment, productTotal) === null;

  const resetRegister = (): void => {
    setForm(EMPTY_OTHER_FORM);
    setOtherPayment(EMPTY_CHARGE_PAYMENT);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductPayment(EMPTY_CHARGE_PAYMENT);
    setDepositForm({ student_id: "", amount: 0, payment_method: "cash", notes: "" });
    setRegisterType("product");
    setShowRegister(false);
  };

  const handleRegister = async () => {
    if (!otherPaymentReady) return;
    await recordMutation.mutateAsync({
      ...chargePayload(otherPayment, otherAmount),
      transaction_type: "other",
      amount: otherAmount,
      notes: form.notes || undefined,
    });
    resetRegister();
  };

  const handleSellProduct = async () => {
    if (!productForm.product_id || !productPaymentReady) return;
    await sellMutation.mutateAsync({
      ...chargePayload(productPayment, productTotal),
      product_id: productForm.product_id,
      quantity: productForm.quantity,
    });
    resetRegister();
  };

  const handleDeposit = async () => {
    if (!depositForm.student_id || depositForm.amount <= 0) return;
    await depositMutation.mutateAsync({
      studentId: depositForm.student_id,
      data: {
        amount: depositForm.amount,
        payment_method: depositForm.payment_method,
        notes: depositForm.notes || undefined,
      },
    });
    resetRegister();
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

      {lastCutTime && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-4 py-2.5 text-sm text-[--tx-muted]">
          <Receipt className="h-4 w-4 text-[--gold]" />
          {t("caja.sinceLastCut", { time: lastCutTime })}
        </div>
      )}
      {summary?.includes_previous_days && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[--color-warning-bd] bg-[--color-warning-bg] px-4 py-2.5 text-sm text-[--color-warning]">
          <AlertTriangle className="h-4 w-4" />
          {t("caja.openPeriodPreviousDays", { date: formatDate(summary.period_start_date) })}
        </div>
      )}

      {/* Today's summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={DollarSign}
          label={lastCutTime ? t("caja.totalSinceCut") : t("caja.totalOpen")}
          value={formatCurrency(summary?.grand_total ?? 0)}
          accent
        />
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
            {lastCutTime
              ? t("caja.movementsSinceCut", { count: openTransactions.length })
              : t("caja.openMovements", { count: openTransactions.length })}
          </h2>
        </div>
        {openTransactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-[--tx-muted]">
            {lastCutTime ? t("caja.noPaymentsSinceCut") : t("caja.noPaymentsOpen")}
          </p>
        ) : (
          <div className="divide-y divide-[--bd-default]">
            {openTransactions.map((tx) => (
              <div key={tx.transaction_id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg]">
                  <TxIcon type={tx.transaction_type} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[--tx-primary]">
                    {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                    {tx.transaction_date !== today && (
                      <span className="ml-2 rounded-md bg-[--bg-muted] px-1.5 py-0.5 text-[10px] font-semibold text-[--tx-muted]">
                        {formatDate(tx.transaction_date)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[--tx-muted]">
                    {describePayment(tx, formatCurrency)}
                    {tx.notes ? ` · ${tx.notes}` : ""}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditTx(tx)}
                      className="rounded-lg p-1.5 text-[--tx-disabled] transition-colors hover:bg-[--bg-muted] hover:text-[--gold]"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTx(tx)}
                      className="rounded-lg p-1.5 text-[--tx-disabled] transition-colors hover:bg-[--color-danger-bg] hover:text-[--color-danger]"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <span className="font-semibold text-[--tx-primary]">{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending debts (fiado) across all students */}
      {pendingDebts.length > 0 && (
        <div className="mb-8 rounded-2xl border border-[--color-danger-bd] bg-[--bg-surface]">
          <div className="flex items-center justify-between border-b border-[--bd-default] px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[--tx-primary]">
              <AlertTriangle className="h-5 w-5 text-[--color-danger]" />
              {t("caja.pendingDebts", { count: pendingDebts.length })}
            </h2>
            <span className="font-bold text-[--color-danger]">
              {formatCurrency(pendingDebts.reduce((sum, d) => sum + d.amount, 0))}
            </span>
          </div>
          <div className="divide-y divide-[--bd-default]">
            {pendingDebts.map((d) => (
              <div key={`${d.student_id}-${d.sale_id}`} className="flex items-center gap-4 px-6 py-3">
                <div className="flex-1">
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: d.student_id }}
                    className="text-sm font-medium text-[--tx-primary] hover:text-[--gold]"
                  >
                    {studentNames[d.student_id] ?? d.student_id}
                  </Link>
                  <p className="text-xs text-[--tx-muted]">
                    {d.description} · {formatDate(d.created_at)}
                  </p>
                </div>
                <span className="font-semibold text-[--color-danger]">{formatCurrency(d.amount)}</span>
                <Link
                  to="/students/$studentId"
                  params={{ studentId: d.student_id }}
                  className="rounded-xl border border-[--bd-default] px-3 py-2 text-xs font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
                >
                  {t("caja.collect")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <button
                  onClick={async () => {
                    const full = await transactionService.getCashCut(cut.cut_id);
                    const m = await loadExportReports();
                    m.exportCashCutPDF(full, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-xs font-medium text-[--tx-muted] transition-all hover:border-[--color-danger-bd] hover:text-[--color-danger]"
                  title={t("caja.printReceipt")}
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
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
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[--gold-bd] p-6 shadow-2xl"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <h2 className="mb-4 text-xl font-bold text-[--tx-primary]">{t("caja.registerPayment")}</h2>

            {/* Type selector tabs — memberships get auto-recorded from "Nueva Membresía" */}
            <div className="mb-5 flex rounded-xl border border-[--bd-default] bg-[--bg-muted] p-1">
              {(["product", "other", "deposit"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRegisterType(tab)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                    registerType === tab
                      ? "text-[--gold-fg]"
                      : "text-[--tx-muted] hover:text-[--tx-primary]"
                  }`}
                  style={
                    registerType === tab
                      ? { background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)" }
                      : {}
                  }
                >
                  {tab === "deposit" ? t("caja.depositTab") : TRANSACTION_TYPE_LABELS[tab]}
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
                students={allStudents}
                payment={productPayment}
                onChange={(patch) => setProductForm((f) => ({ ...f, ...patch }))}
                onPaymentChange={patchProductPayment}
              />
            ) : registerType === "deposit" ? (
              <DepositFields
                form={depositForm}
                students={allStudents}
                onChange={(patch) => setDepositForm((f) => ({ ...f, ...patch }))}
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
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <ChargePaymentSection
                  total={otherAmount}
                  value={otherPayment}
                  onChange={patchOtherPayment}
                  students={allStudents}
                  inputClassName={selectCls}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                    {t("caja.notesOptional")}
                  </label>
                  <input
                    className={inputCls}
                    placeholder={t("caja.paymentNotesPlaceholder")}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={resetRegister}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] transition-all hover:bg-[--bg-muted]"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() =>
                  void (
                    registerType === "product"
                      ? handleSellProduct()
                      : registerType === "deposit"
                        ? handleDeposit()
                        : handleRegister()
                  )
                }
                disabled={
                  registerType === "product"
                    ? !productForm.product_id ||
                      productForm.quantity < 1 ||
                      !productPaymentReady ||
                      sellMutation.isPending
                    : registerType === "deposit"
                      ? !depositForm.student_id ||
                        depositForm.amount <= 0 ||
                        depositMutation.isPending
                      : !otherPaymentReady || recordMutation.isPending
                }
                className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {(registerType === "product"
                  ? sellMutation.isPending
                  : registerType === "deposit"
                    ? depositMutation.isPending
                    : recordMutation.isPending)
                  ? t("common.saving")
                  : registerType === "product"
                    ? productPayment.paymentStatus === "pending"
                      ? `${t("charge.registerDebt")} ${formatCurrency(productTotal)}`
                      : `${t("caja.sell")} ${formatCurrency(productTotal)}`
                    : registerType === "deposit"
                      ? t("caja.confirmDeposit")
                      : t("caja.register")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Edit transaction modal */}
      <EditTransactionModal
        open={!!editTx}
        onClose={() => setEditTx(null)}
        transaction={editTx}
      />

      {/* Admin: Delete transaction confirm */}
      <ConfirmDialog
        open={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={() => {
          if (!deleteTx) return;
          deleteMutation.mutate(deleteTx.transaction_id, {
            onSuccess: () => setDeleteTx(null),
          });
        }}
        title="Eliminar Transacción"
        description={`¿Estás seguro de eliminar esta transacción de ${formatCurrency(deleteTx?.amount ?? 0)}? Esta acción es irreversible.`}
        confirmLabel="Sí, eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
      />

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
              {summary?.includes_previous_days
                ? t("caja.cutDescRange", {
                    from: formatDate(summary.period_start_date),
                    to: formatDate(today),
                  })
                : t("caja.cutDesc", { date: formatDate(today) })}{" "}
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
  students,
  payment,
  onChange,
  onPaymentChange,
}: {
  form: ProductSaleForm;
  products: Product[];
  selectedProduct: Product | null;
  total: number;
  students: Student[];
  payment: ChargePaymentValue;
  onChange: (patch: Partial<ProductSaleForm>) => void;
  onPaymentChange: (patch: Partial<ChargePaymentValue>) => void;
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

      <ChargePaymentSection
        total={total}
        value={payment}
        onChange={onPaymentChange}
        students={students}
        inputClassName={selectCls}
      />
    </div>
  );
}

// ─── Deposit fields ────────────────────────────────────────────────────────────────────

function DepositFields({
  form,
  students,
  onChange,
}: {
  form: DepositForm;
  students: Student[];
  onChange: (patch: Partial<DepositForm>) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Student selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
          {t("caja.selectStudent").replace("— ", "").replace(" —", "")} *
        </label>
        <select
          className={selectCls}
          value={form.student_id}
          onChange={(e) => onChange({ student_id: e.target.value })}
        >
          <option value="">{t("caja.selectStudent")}</option>
          {students.map((s) => (
            <option key={s.student_id} value={s.student_id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
          {t("caja.depositAmount")} *
        </label>
        <input
          type="number"
          min="1"
          step="0.01"
          className={inputCls}
          placeholder="0.00"
          value={form.amount || ""}
          onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
        />
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

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
          {t("caja.depositNotes")}
        </label>
        <input
          className={inputCls}
          placeholder={t("caja.depositNotesPlaceholder")}
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-4 py-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[--gold]" />
          <p className="text-xs text-[--tx-muted]">
            {t("balance.availableBalance", { amount: "" })}
            Este abono se añadirá al saldo a favor del alumno.
          </p>
        </div>
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
