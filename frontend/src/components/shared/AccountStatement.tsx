/**
 * Student account statement (estado de cuenta): everything the student bought
 * or was charged, how it was paid (now / with balance / still owed) and their
 * balance deposits. Pending charges can be collected right here.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Package,
  Receipt,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useStudentAccount } from "@/hooks/useAccount";
import { usePayAllDebts, usePayDebt } from "@/hooks/useDebts";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AccountEntry } from "@/types/account";
import type { BasicPaymentMethod } from "@/types/transaction";
import { PAYMENT_METHOD_DISPLAY, PAYMENT_METHOD_LABELS } from "@/types/transaction";

interface AccountStatementProps {
  studentId: string;
  /** Hide the collect controls (read-only view). */
  readOnly?: boolean;
  /** Max history rows to show (pending charges are always shown). */
  limit?: number;
}

export function AccountStatement({
  studentId,
  readOnly = false,
  limit = 20,
}: AccountStatementProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: account, isLoading } = useStudentAccount(studentId);
  const payDebt = usePayDebt();
  const payAll = usePayAllDebts();
  const [method, setMethod] = useState<BasicPaymentMethod>("cash");
  const [applyBalance, setApplyBalance] = useState(false);

  const entries = account?.entries ?? [];
  const pending = entries.filter((e) => e.status === "pending");
  const history = entries.filter((e) => e.status !== "pending").slice(0, limit);
  const hasBalance = (account?.current_balance ?? 0) > 0;
  const paying = payDebt.isPending || payAll.isPending;
  const payload = { payment_method: method, use_balance: applyBalance && hasBalance };

  if (isLoading) {
    return <p className="py-6 text-center text-xs text-[--tx-disabled]">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Pending charges */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-[--color-danger-bd] bg-[--color-danger-bg] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[--color-danger]" />
              <p className="font-bold text-[--color-danger]">
                {t("account.owes", { amount: formatCurrency(account?.total_pending ?? 0) })}
              </p>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                {hasBalance && (
                  <label className="flex items-center gap-1.5 text-xs text-[--tx-primary]">
                    <input
                      type="checkbox"
                      checked={applyBalance}
                      onChange={(e) => setApplyBalance(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[--gold]"
                    />
                    {t("debt.useBalance")} ({formatCurrency(account?.current_balance ?? 0)})
                  </label>
                )}
                <select
                  className="rounded-lg border border-[--bd-default] bg-[--bg-muted] px-2 py-1.5 text-xs text-[--tx-primary]"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as BasicPaymentMethod)}
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                {pending.length > 1 && (
                  <button
                    onClick={() => payAll.mutate({ studentId, data: payload })}
                    disabled={paying}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: "var(--color-danger)", color: "var(--gold-fg)" }}
                  >
                    {paying ? t("common.saving") : t("debt.payAll")}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {pending.map((e) => (
              <div
                key={e.entry_id}
                className="flex items-center justify-between gap-3 rounded-lg bg-[--bg-surface] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[--tx-primary]">{e.description}</p>
                  <p className="text-xs text-[--tx-muted]">
                    {conceptLabel(e, t)} · {formatDate(e.date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold text-[--color-danger]">
                    {formatCurrency(e.pending_amount)}
                  </span>
                  {!readOnly && e.debt_id && (
                    <button
                      onClick={() =>
                        payDebt.mutate({ studentId, saleId: e.debt_id ?? "", data: payload })
                      }
                      disabled={paying}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "var(--color-danger)", color: "var(--gold-fg)" }}
                    >
                      {t("debt.pay")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length === 0 && pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-[--color-success]" />
          <p className="text-sm text-[--tx-muted]">{t("account.empty")}</p>
        </div>
      ) : (
        <div className="divide-y divide-[--bd-subtle]">
          {history.map((e) => (
            <StatementRow key={e.entry_id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatementRow({ entry: e }: { entry: AccountEntry }): React.JSX.Element {
  const { t } = useTranslation();
  const isDeposit = e.kind === "deposit";
  const parts: string[] = [];
  if (e.paid_now > 0 && e.payment_method) {
    parts.push(`${PAYMENT_METHOD_DISPLAY[e.payment_method] ?? e.payment_method} ${formatCurrency(e.paid_now)}`);
  }
  if (e.paid_with_balance > 0) parts.push(`${t("account.withBalance")} ${formatCurrency(e.paid_with_balance)}`);
  if (e.paid_at) parts.push(t("account.paidOn", { date: formatDate(e.paid_at) }));

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isDeposit ? "bg-[--color-success-bg]" : "bg-[--gold-bg]"
        }`}
      >
        <EntryIcon entry={e} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[--tx-primary]">{e.description}</p>
        <p className="truncate text-xs text-[--tx-muted]">
          {isDeposit ? t("account.deposit") : conceptLabel(e, t)} · {formatDate(e.date)}
          {parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-semibold ${isDeposit ? "text-[--color-success]" : "text-[--tx-primary]"}`}>
          {isDeposit ? "+" : ""}
          {formatCurrency(e.amount)}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
        >
          {isDeposit ? t("account.depositBadge") : t("account.paid")}
        </span>
      </div>
    </div>
  );
}

function EntryIcon({ entry }: { entry: AccountEntry }): React.JSX.Element {
  const cls = "h-4 w-4 text-[--gold]";
  if (entry.kind === "deposit") return <Wallet className="h-4 w-4 text-[--color-success]" />;
  switch (entry.concept_type) {
    case "membership":
    case "class_pack":
      return <CreditCard className={cls} />;
    case "product":
      return <Package className={cls} />;
    case "other":
      return <Receipt className={cls} />;
    default:
      return <ShoppingBag className={cls} />;
  }
}

function conceptLabel(e: AccountEntry, t: (key: string) => string): string {
  switch (e.concept_type) {
    case "membership":
      return t("account.conceptMembership");
    case "class_pack":
      return t("account.conceptClassPack");
    case "product":
      return t("account.conceptProduct");
    default:
      return t("account.conceptOther");
  }
}
