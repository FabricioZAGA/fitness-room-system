/**
 * Shared "how is this charge paid?" section for every Caja charge
 * (product sales, other charges and memberships):
 * buyer (student or "Público general"), paid now vs. left as debt (fiado),
 * use of the student's balance, and the method/mixed breakdown for the rest.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { useStudentBalance } from "@/hooks/useBalance";
import { formatCurrency } from "@/lib/utils";
import { round2 } from "@/lib/payments";
import {
  PUBLIC_BUYER,
  chargeError,
  dueNow,
  hasStudent,
  type ChargePaymentValue,
} from "@/lib/charge";
import type { Student } from "@/types/student";
import { PaymentMethodField } from "./PaymentMethodField";

interface ChargePaymentSectionProps {
  /** Total amount of the charge. */
  total: number;
  value: ChargePaymentValue;
  onChange: (patch: Partial<ChargePaymentValue>) => void;
  /** Students for the buyer selector. Omit together with `hideBuyer` when the buyer is fixed. */
  students?: Student[];
  /** Hide the buyer selector (e.g. memberships, where the student is chosen elsewhere). */
  hideBuyer?: boolean;
  /** Offer "Público general" in the buyer selector (pay-now only). */
  allowPublic?: boolean;
  /** Tailwind classes for selects/inputs so it matches the host form. */
  inputClassName: string;
  /** Label classes so it matches the host form. */
  labelClassName?: string;
}

export function ChargePaymentSection({
  total,
  value,
  onChange,
  students = [],
  hideBuyer = false,
  allowPublic = true,
  inputClassName,
  labelClassName = "mb-1.5 block text-sm font-medium text-[--tx-muted]",
}: ChargePaymentSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const studentSelected = hasStudent(value);
  const { data: balance } = useStudentBalance(studentSelected ? value.studentId : undefined);
  const available = studentSelected ? Math.max(balance?.current_balance ?? 0, 0) : 0;
  const pending = value.paymentStatus === "pending";
  const usingBalance = value.balanceAmount > 0;
  const due = dueNow(value, total);
  const error = chargeError(value, total);

  // Keep the applied balance within the available balance and the total.
  useEffect(() => {
    const max = round2(Math.min(available, total));
    if (pending || !studentSelected) {
      if (value.balanceAmount !== 0) onChange({ balanceAmount: 0 });
    } else if (value.balanceAmount > max) {
      onChange({ balanceAmount: max });
    }
  }, [available, total, pending, studentSelected, value.balanceAmount, onChange]);

  return (
    <div className="space-y-4">
      {!hideBuyer && (
        <div>
          <label className={labelClassName}>{t("charge.buyer")} *</label>
          <select
            className={inputClassName}
            value={value.studentId}
            onChange={(e) => onChange({ studentId: e.target.value, balanceAmount: 0 })}
          >
            <option value="">{t("charge.selectBuyer")}</option>
            {allowPublic && <option value={PUBLIC_BUYER}>{t("charge.publicBuyer")}</option>}
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.full_name}
              </option>
            ))}
          </select>
          {value.studentId === PUBLIC_BUYER && (
            <p className="mt-1 text-xs text-[--tx-muted]">{t("charge.publicHint")}</p>
          )}
        </div>
      )}

      {/* Paid now vs. leave as debt (fiado) */}
      <div>
        <label className={labelClassName}>{t("charge.status")}</label>
        <div className="flex rounded-xl border border-[--bd-default] bg-[--bg-muted] p-1">
          {(["paid", "pending"] as const).map((status) => {
            const selected = value.paymentStatus === status;
            const disabled = status === "pending" && !studentSelected;
            return (
              <button
                key={status}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ paymentStatus: status })}
                className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  selected
                    ? {
                        background:
                          status === "paid" ? "var(--color-success-bg)" : "var(--color-warning-bg)",
                        color: status === "paid" ? "var(--color-success)" : "var(--color-warning)",
                        border: `1px solid ${
                          status === "paid" ? "var(--color-success-bd)" : "var(--color-warning-bd)"
                        }`,
                      }
                    : { color: "var(--tx-muted)" }
                }
              >
                {status === "paid" ? t("charge.paidNow") : t("charge.leavePending")}
              </button>
            );
          })}
        </div>
        {pending && (
          <p className="mt-1 text-xs text-[--color-warning]">
            {t("charge.pendingHint", { amount: formatCurrency(total) })}
          </p>
        )}
      </div>

      {/* Balance (saldo a favor) */}
      {!pending && studentSelected && available > 0 && total > 0 && (
        <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={usingBalance}
              onChange={(e) =>
                onChange({
                  balanceAmount: e.target.checked ? round2(Math.min(available, total)) : 0,
                })
              }
              className="h-4 w-4 rounded accent-[--gold]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[--gold]" />
                <span className="text-sm font-semibold text-[--tx-primary]">
                  {t("balance.applyQuestion")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[--tx-muted]">
                {t("balance.availableBalance", { amount: formatCurrency(available) })}
              </p>
            </div>
          </label>
          {usingBalance && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-xs text-[--tx-muted]">
                  {t("charge.balanceToUse")}
                </span>
                <input
                  type="number"
                  min={0}
                  max={Math.min(available, total)}
                  step="0.01"
                  className={inputClassName}
                  value={value.balanceAmount || ""}
                  onChange={(e) =>
                    onChange({
                      balanceAmount: round2(
                        Math.min(Math.max(parseFloat(e.target.value) || 0, 0), available, total),
                      ),
                    })
                  }
                />
              </div>
              <p className="text-xs font-semibold text-[--tx-primary]">
                {t("balance.remaining", { amount: formatCurrency(due) })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Method for what is paid now */}
      {!pending && due > 0 && (
        <div>
          <label className={labelClassName}>
            {usingBalance
              ? t("charge.methodForRemaining", { amount: formatCurrency(due) })
              : t("caja.paymentMethod")}{" "}
            *
          </label>
          <PaymentMethodField
            total={due}
            method={value.paymentMethod}
            splits={value.paymentSplits}
            inputClassName={inputClassName}
            onChange={(paymentMethod, paymentSplits) => onChange({ paymentMethod, paymentSplits })}
          />
        </div>
      )}

      {error && error !== "charge.errors.incompleteSplit" && value.studentId !== "" && (
        <p className="text-xs text-[--color-danger]">{t(error)}</p>
      )}
    </div>
  );
}
