/** Pure helpers for Caja charges: who pays, how much with balance, fiado or now. */

import { isPaymentComplete, round2, splitsForPayload } from "@/lib/payments";
import type { ChargePaymentStatus } from "@/types/membership";
import type { PaymentMethod, PaymentSplit } from "@/types/transaction";

/** Sentinel value of the student selector for anonymous buyers. */
export const PUBLIC_BUYER = "__public__";

export interface ChargePaymentValue {
  /** Student ID, `PUBLIC_BUYER` ("Público general") or "" (nothing selected yet). */
  studentId: string;
  paymentStatus: ChargePaymentStatus;
  /** Amount covered with the student's balance (kept ≤ total and ≤ balance). */
  balanceAmount: number;
  paymentMethod: PaymentMethod;
  paymentSplits: PaymentSplit[];
}

export const EMPTY_CHARGE_PAYMENT: ChargePaymentValue = {
  studentId: "",
  paymentStatus: "paid",
  balanceAmount: 0,
  paymentMethod: "cash",
  paymentSplits: [],
};

/** Whether a real student (not "Público general") is selected. */
export function hasStudent(value: ChargePaymentValue): boolean {
  return value.studentId !== "" && value.studentId !== PUBLIC_BUYER;
}

/** Amount collected now with cash / card / transfer. */
export function dueNow(value: ChargePaymentValue, total: number): number {
  if (value.paymentStatus === "pending") return 0;
  return Math.max(round2(total - value.balanceAmount), 0);
}

/** Validation error key (i18n) or null when the charge can be submitted. */
export function chargeError(value: ChargePaymentValue, total: number): string | null {
  if (value.studentId === "") return "charge.errors.selectBuyer";
  if (!hasStudent(value) && value.paymentStatus === "pending") return "charge.errors.pendingNeedsStudent";
  if (!hasStudent(value) && value.balanceAmount > 0) return "charge.errors.balanceNeedsStudent";
  if (value.balanceAmount - total > 0.005) return "charge.errors.balanceExceedsTotal";
  const due = dueNow(value, total);
  if (due > 0 && !isPaymentComplete(due, value.paymentMethod, value.paymentSplits)) {
    return "charge.errors.incompleteSplit";
  }
  return null;
}

/** Settlement fields for the API payload (shared by sales, charges and memberships). */
export function chargePayload(
  value: ChargePaymentValue,
  total: number,
): {
  student_id?: string;
  payment_status: ChargePaymentStatus;
  balance_amount: number;
  payment_method: PaymentMethod;
  payment_splits?: PaymentSplit[];
} {
  const pending = value.paymentStatus === "pending";
  const due = dueNow(value, total);
  return {
    student_id: hasStudent(value) ? value.studentId : undefined,
    payment_status: value.paymentStatus,
    balance_amount: pending ? 0 : round2(value.balanceAmount),
    payment_method: value.paymentMethod,
    payment_splits:
      pending || due <= 0 ? undefined : splitsForPayload(value.paymentMethod, value.paymentSplits),
  };
}
