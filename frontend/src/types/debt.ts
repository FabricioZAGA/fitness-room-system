/** TypeScript types for Student Debts (cargos pendientes / fiado). */

import type { BasicPaymentMethod, PaymentMethod, PaymentSplit, TransactionType } from "./transaction";

export interface StudentDebt {
  student_id: string;
  /** Debt identifier (the inventory sale ID for product debts). */
  sale_id: string;
  /** What was charged: product, membership, class pack or other. */
  concept_type: TransactionType;
  /** Human-readable concept, e.g. "Venta: Proteína x1" or "Membresía: Room Elite". */
  description: string;
  /** Legacy field — same as description for non-product debts. */
  product_name: string;
  amount: number;
  quantity: number;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayDebtRequest {
  payment_method: PaymentMethod | BasicPaymentMethod;
  /** Required when payment_method is "mixed" (single debt only). */
  payment_splits?: PaymentSplit[];
  /** Cover the debt with the student's balance first. */
  use_balance?: boolean;
  notes?: string;
}
