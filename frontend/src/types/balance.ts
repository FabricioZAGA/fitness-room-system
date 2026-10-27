/** TypeScript types for Student Balance (monedero interno / saldo a favor). */

/** "membership_apply" is legacy (≤ v2.x); v3.0.0+ records every use as "charge_apply". */
export type BalanceMovementType = "deposit" | "membership_apply" | "charge_apply" | "withdrawal";

export const BALANCE_MOVEMENT_TYPE_LABELS: Record<BalanceMovementType, string> = {
  deposit: "Depósito",
  membership_apply: "Aplicado a membresía",
  charge_apply: "Pago con saldo",
  withdrawal: "Retiro",
};

export interface StudentBalance {
  student_id: string;
  current_balance: number;
  updated_at: string;
}

export interface BalanceMovement {
  movement_id: string;
  student_id: string;
  amount: number;
  movement_type: BalanceMovementType;
  payment_method: string | null;
  reference_id: string | null;
  notes: string | null;
  balance_after: number;
  created_at: string;
  updated_at: string;
}

export interface DepositRequest {
  amount: number;
  payment_method: string;
  notes?: string;
}

export interface ApplyBalanceRequest {
  amount: number;
  membership_id: string;
}
