import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import {
  useCreateCashCut,
  useCashCuts,
  useTransactionsByDate,
  useTodaySummary,
  useRecordTransaction,
} from "@/hooks/useTransactions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CreateTransactionRequest, PaymentMethod, TransactionType } from "@/types/transaction";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/types/transaction";

export const Route = createFileRoute("/caja/")({
  component: CajaPage,
});

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

const selectCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

function CajaPage(): React.JSX.Element {
  const today = new Date().toISOString().split("T")[0];
  const [showRegister, setShowRegister] = useState(false);
  const [showCutConfirm, setShowCutConfirm] = useState(false);
  const [cutNotes, setCutNotes] = useState("");
  const [form, setForm] = useState<Partial<CreateTransactionRequest>>({
    payment_method: "cash",
    transaction_type: "membership",
  });

  const { data: summary } = useTodaySummary();
  const { data: todayTransactions = [] } = useTransactionsByDate(today);
  const { data: cashCuts = [] } = useCashCuts();
  const recordMutation = useRecordTransaction();
  const cutMutation = useCreateCashCut();

  const handleRegister = async () => {
    if (!form.amount || !form.transaction_type || !form.payment_method) return;
    await recordMutation.mutateAsync({
      transaction_type: form.transaction_type as TransactionType,
      amount: Number(form.amount),
      payment_method: form.payment_method as PaymentMethod,
      student_id: form.student_id,
      notes: form.notes,
    });
    setForm({ payment_method: "cash", transaction_type: "membership" });
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
          <h1 className="text-3xl font-bold text-[--tx-primary]">Caja</h1>
          <p className="mt-1 text-[--tx-muted]">Registro de pagos y corte de caja</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-surface] px-4 py-2.5 text-sm font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd]"
          >
            <Plus className="h-4 w-4" />
            Registrar Pago
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
            Corte de Caja
          </button>
        </div>
      </div>

      {/* Today's summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={DollarSign}
          label="Total del Día"
          value={formatCurrency(summary?.grand_total ?? 0)}
          accent
        />
        <SummaryCard
          icon={Banknote}
          label="Efectivo"
          value={formatCurrency(summary?.total_cash ?? 0)}
        />
        <SummaryCard
          icon={CreditCard}
          label="Tarjeta"
          value={formatCurrency(summary?.total_card ?? 0)}
        />
        <SummaryCard
          icon={ArrowRightLeft}
          label="Transferencia"
          value={formatCurrency(summary?.total_transfer ?? 0)}
        />
      </div>

      {/* By type breakdown */}
      {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
        <div className="mb-8 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[--tx-primary]">Por Categoría</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary.by_type).map(([type, amount]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-xl bg-[--bg-muted] px-4 py-3"
              >
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
            Movimientos de Hoy ({todayTransactions.length})
          </h2>
        </div>
        {todayTransactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-[--tx-muted]">
            No hay pagos registrados hoy
          </p>
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
                <span className="font-semibold text-[--tx-primary]">
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent cash cuts */}
      {cashCuts.length > 0 && (
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
          <div className="border-b border-[--bd-default] px-6 py-4">
            <h2 className="text-lg font-semibold text-[--tx-primary]">Cortes Recientes</h2>
          </div>
          <div className="divide-y divide-[--bd-default]">
            {cashCuts.slice(0, 5).map((cut) => (
              <div key={cut.cut_id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg]">
                  <Receipt className="h-5 w-5 text-[--gold]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[--tx-primary]">
                    Corte del {formatDate(cut.cut_date)}
                  </p>
                  <p className="text-xs text-[--tx-muted]">
                    {cut.transaction_count} movimiento{cut.transaction_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="font-semibold text-[--tx-primary]">
                  {formatCurrency(cut.grand_total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register payment modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[--gold-bd] p-6 shadow-2xl" style={{ backgroundColor: "var(--bg-elevated)" }}>
            <h2 className="mb-6 text-xl font-bold text-[--tx-primary]">Registrar Pago</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Tipo de pago *
                </label>
                <select
                  className={selectCls}
                  value={form.transaction_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transaction_type: e.target.value as TransactionType }))
                  }
                >
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Monto (MXN) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={form.amount ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Método de pago *
                </label>
                <select
                  className={selectCls}
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))
                  }
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                  Notas (opcional)
                </label>
                <input
                  className={inputCls}
                  placeholder="Descripción del pago..."
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRegister(false)}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] transition-all hover:bg-[--bg-muted]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleRegister()}
                disabled={!form.amount || recordMutation.isPending}
                className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {recordMutation.isPending ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash cut confirm modal */}
      {showCutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[--gold-bd] p-6 shadow-2xl" style={{ backgroundColor: "var(--bg-elevated)" }}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[--gold-bg]">
              <Receipt className="h-7 w-7 text-[--gold]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[--tx-primary]">Corte de Caja</h2>
            <p className="mb-4 text-sm text-[--tx-muted]">
              Se generará un resumen de todos los movimientos del día de hoy (
              {formatDate(today)}). Total acumulado:{" "}
              <span className="font-semibold text-[--tx-primary]">
                {formatCurrency(summary?.grand_total ?? 0)}
              </span>
            </p>
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                Notas del corte (opcional)
              </label>
              <textarea
                rows={2}
                className={inputCls}
                placeholder="Observaciones del cierre..."
                value={cutNotes}
                onChange={(e) => setCutNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCutConfirm(false)}
                className="flex-1 rounded-xl border border-[--bd-default] py-3 text-sm font-medium text-[--tx-muted] transition-all hover:bg-[--bg-muted]"
              >
                Cancelar
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
                {cutMutation.isPending ? "Generando..." : "Confirmar Corte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-[--gold-bd] bg-[--gold-bg]"
          : "border-[--bd-default] bg-[--bg-surface]"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "var(--gold-bg)" }}
        >
          <Icon className="h-4 w-4 text-[--gold]" />
        </div>
        <span className="text-sm text-[--tx-muted]">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold ${accent ? "text-[--gold]" : "text-[--tx-primary]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function TxIcon({ type }: { type: string }): React.JSX.Element {
  const cls = "h-5 w-5 text-[--gold]";
  switch (type) {
    case "membership":
      return <Users className={cls} />;
    case "class_pack":
      return <CheckCircle className={cls} />;
    case "product":
      return <Package className={cls} />;
    default:
      return <ShoppingBag className={cls} />;
  }
}
