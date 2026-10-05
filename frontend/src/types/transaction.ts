/** TypeScript types for Transaction and CashCut entities. */

/** Single payment method — what each portion of a payment can be. */
export type BasicPaymentMethod = "cash" | "card" | "transfer";
/** "mixed" = paid with several methods; breakdown lives in `payment_splits`. */
export type PaymentMethod = BasicPaymentMethod | "mixed";
export type TransactionType = "membership" | "class_pack" | "product" | "other";

/** Labels for the selectable single methods (used by plain selects). */
export const PAYMENT_METHOD_LABELS: Record<BasicPaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

/** Display labels for any stored payment method, including "mixed". */
export const PAYMENT_METHOD_DISPLAY: Record<PaymentMethod, string> = {
  ...PAYMENT_METHOD_LABELS,
  mixed: "Mixto",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  membership: "Membresía",
  class_pack: "Paquete de Clases",
  product: "Producto",
  other: "Otro",
};

export interface PaymentSplit {
  method: BasicPaymentMethod;
  amount: number;
}

export interface Transaction {
  transaction_id: string;
  student_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  payment_method: PaymentMethod;
  payment_splits?: PaymentSplit[] | null;
  reference_id: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionRequest {
  student_id?: string;
  transaction_type: TransactionType;
  amount: number;
  payment_method: PaymentMethod;
  payment_splits?: PaymentSplit[];
  reference_id?: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  amount?: number;
  payment_method?: PaymentMethod;
  payment_splits?: PaymentSplit[];
  transaction_type?: TransactionType;
  notes?: string;
}

export interface CashCut {
  cut_id: string;
  cut_date: string;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  grand_total: number;
  transaction_count: number;
  notes: string | null;
  period_start?: string | null;
  transactions: Transaction[];
  created_at: string;
  updated_at: string;
}

export interface CreateCashCutRequest {
  cut_date: string;
  notes?: string;
}

/** "day" = whole day (dashboard) · "period" = since the last cash cut (Caja). */
export type SummaryScope = "day" | "period";

export interface TodaySummary {
  date: string;
  scope?: SummaryScope;
  last_cut_at?: string | null;
  transaction_count: number;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  grand_total: number;
  by_type: Record<string, number>;
}

/** Human-readable payment description, e.g. "Mixto (Efectivo $300 · Tarjeta $500)". */
export function describePayment(
  tx: Pick<Transaction, "payment_method" | "payment_splits">,
  format: (n: number) => string,
): string {
  const label = PAYMENT_METHOD_DISPLAY[tx.payment_method] ?? tx.payment_method;
  if (tx.payment_method !== "mixed" || !tx.payment_splits?.length) return label;
  const parts = tx.payment_splits.map(
    (s) => `${PAYMENT_METHOD_LABELS[s.method] ?? s.method} ${format(s.amount)}`,
  );
  return `${label} (${parts.join(" · ")})`;
}
