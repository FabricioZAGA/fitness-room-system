/** TypeScript types for Student Debts (ventas pendientes / fiado). */

export interface StudentDebt {
  student_id: string;
  sale_id: string;
  product_name: string;
  amount: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface PayDebtRequest {
  payment_method: string;
  notes?: string;
}
