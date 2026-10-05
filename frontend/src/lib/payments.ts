/** Helpers for single and mixed (split) payments. */

import type { PaymentMethod, PaymentSplit } from "@/types/transaction";

export const SPLIT_TOLERANCE = 0.01;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sum of a mixed-payment breakdown. */
export function splitsTotal(splits: PaymentSplit[]): number {
  return round2(splits.reduce((acc, s) => acc + s.amount, 0));
}

/** Whether the selected method/breakdown is ready to submit for ``total``. */
export function isPaymentComplete(
  total: number,
  method: PaymentMethod,
  splits: PaymentSplit[],
): boolean {
  if (method !== "mixed") return true;
  const used = splits.filter((s) => s.amount > 0);
  return used.length >= 2 && Math.abs(splitsTotal(used) - round2(total)) <= SPLIT_TOLERANCE;
}

/** Splits to send to the API (only for mixed payments, zero rows dropped). */
export function splitsForPayload(
  method: PaymentMethod,
  splits: PaymentSplit[],
): PaymentSplit[] | undefined {
  return method === "mixed" ? splits.filter((s) => s.amount > 0) : undefined;
}
