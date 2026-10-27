/** Student account statement (estado de cuenta) — mirrors backend models/account.py. */

import type { PaymentMethod, PaymentSplit, TransactionType } from "./transaction";

export type AccountEntryKind = "charge" | "deposit";
export type AccountEntryStatus = "paid" | "pending";

export interface AccountEntry {
  entry_id: string;
  kind: AccountEntryKind;
  date: string;
  concept_type: TransactionType | null;
  description: string;
  /** Total charged (or deposited). */
  amount: number;
  status: AccountEntryStatus;
  paid_now: number;
  paid_with_balance: number;
  pending_amount: number;
  payment_method: PaymentMethod | null;
  payment_splits: PaymentSplit[] | null;
  reference_id: string | null;
  /** Set while the charge is still owed — use it to pay the debt. */
  debt_id: string | null;
  paid_at: string | null;
}

export interface StudentAccount {
  student_id: string;
  current_balance: number;
  total_pending: number;
  pending_count: number;
  /** Newest first. */
  entries: AccountEntry[];
}
