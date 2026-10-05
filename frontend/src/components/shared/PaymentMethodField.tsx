/** Payment method selector with support for mixed payments (e.g. part cash, part card). */

import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils";
import { round2, SPLIT_TOLERANCE as TOLERANCE, splitsTotal } from "@/lib/payments";
import type { BasicPaymentMethod, PaymentMethod, PaymentSplit } from "@/types/transaction";
import { PAYMENT_METHOD_DISPLAY, PAYMENT_METHOD_LABELS } from "@/types/transaction";

const BASIC_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as BasicPaymentMethod[];

interface PaymentMethodFieldProps {
  /** Total amount to be paid — the mixed breakdown must add up to this. */
  total: number;
  method: PaymentMethod;
  splits: PaymentSplit[];
  onChange: (method: PaymentMethod, splits: PaymentSplit[]) => void;
  /** Tailwind classes for the select/inputs so it matches the host form. */
  inputClassName: string;
}

function splitAmount(splits: PaymentSplit[], method: BasicPaymentMethod): number {
  return splits.find((s) => s.method === method)?.amount ?? 0;
}

export function PaymentMethodField({
  total,
  method,
  splits,
  onChange,
  inputClassName,
}: PaymentMethodFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const assigned = splitsTotal(splits);
  const diff = round2(total - assigned);

  function setAmount(target: BasicPaymentMethod, amount: number): void {
    const next = BASIC_METHODS.map((m) => ({
      method: m,
      amount: m === target ? Math.max(0, amount) : splitAmount(splits, m),
    })).filter((s) => s.amount > 0);
    onChange("mixed", next);
  }

  return (
    <div className="space-y-3">
      <select
        className={inputClassName}
        value={method}
        onChange={(e) => onChange(e.target.value as PaymentMethod, [])}
      >
        {(Object.keys(PAYMENT_METHOD_DISPLAY) as PaymentMethod[]).map((m) => (
          <option key={m} value={m}>
            {m === "mixed" ? t("payment.mixedOption") : PAYMENT_METHOD_DISPLAY[m]}
          </option>
        ))}
      </select>

      {method === "mixed" && (
        <div className="space-y-2 rounded-xl border border-[--gold-bd] bg-[--gold-bg] p-3">
          <p className="text-xs text-[--tx-muted]">
            {t("payment.mixedHint", { total: formatCurrency(total) })}
          </p>
          {BASIC_METHODS.map((m) => {
            const value = splitAmount(splits, m);
            return (
              <div key={m} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-sm text-[--tx-primary]">
                  {PAYMENT_METHOD_LABELS[m]}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={inputClassName}
                  value={value || ""}
                  onChange={(e) => setAmount(m, parseFloat(e.target.value) || 0)}
                />
                {diff > TOLERANCE && (
                  <button
                    type="button"
                    onClick={() => setAmount(m, round2(value + diff))}
                    className="shrink-0 rounded-lg border border-[--bd-default] px-2 py-1 text-xs text-[--tx-muted] transition-colors hover:border-[--gold-bd] hover:text-[--gold]"
                    title={t("payment.assignRemaining")}
                  >
                    +{formatCurrency(diff)}
                  </button>
                )}
              </div>
            );
          })}
          <p
            className={`text-xs font-semibold ${
              Math.abs(diff) <= TOLERANCE && splits.length >= 2
                ? "text-[--color-success]"
                : "text-[--color-warning]"
            }`}
          >
            {Math.abs(diff) <= TOLERANCE
              ? splits.length >= 2
                ? t("payment.balanced")
                : t("payment.needsTwo")
              : diff > 0
                ? t("payment.remaining", { amount: formatCurrency(diff) })
                : t("payment.exceeds", { amount: formatCurrency(-diff) })}
          </p>
        </div>
      )}
    </div>
  );
}
