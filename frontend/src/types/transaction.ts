/** TypeScript types for Transaction and CashCut entities. */

export type PaymentMethod = "cash" | "card" | "transfer";
export type TransactionType = "membership" | "class_pack" | "product" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  membership: "Membresía",
  class_pack: "Paquete de Clases",
  product: "Producto",
  other: "Otro",
};

export interface Transaction {
  transaction_id: string;
  student_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  payment_method: PaymentMethod;
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
  reference_id?: string;
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
  transactions: Transaction[];
  created_at: string;
  updated_at: string;
}

export interface CreateCashCutRequest {
  cut_date: string;
  notes?: string;
}

export interface TodaySummary {
  date: string;
  transaction_count: number;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  grand_total: number;
  by_type: Record<string, number>;
}
