/** TypeScript types for the Membership entity — mirrors backend Pydantic models. */

export type MembershipType =
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "class_pack_5"
  | "class_pack_10"
  | "class_pack_20"
  | "day_pass";

export type MembershipStatus = "active" | "frozen" | "expired" | "cancelled" | "pending";

export interface Membership {
  membership_id: string;
  student_id: string;
  membership_type: MembershipType;
  status: MembershipStatus;
  start_date: string;
  end_date: string;
  price_paid: number;
  classes_total: number | null;
  classes_remaining: number | null;
  days_until_expiry: number | null;
  notes: string | null;
  is_frozen: boolean;
  freeze_start_date: string | null;
  freeze_end_date: string | null;
  frozen_days_accumulated: number;
  created_at: string;
  updated_at: string;
}

export interface FreezeMembershipRequest {
  days: number;
}

export interface CreateMembershipRequest {
  student_id: string;
  membership_type: MembershipType;
  start_date: string;
  end_date: string;
  price_paid: number;
  payment_method?: string;
  classes_total?: number;
  notes?: string;
}

export interface UpdateMembershipRequest {
  end_date?: string;
  status?: MembershipStatus;
  price_paid?: number;
  classes_remaining?: number;
  notes?: string;
}

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semi_annual: "Semestral",
  annual: "Anual",
  class_pack_5: "Paquete 5 clases",
  class_pack_10: "Paquete 10 clases",
  class_pack_20: "Paquete 20 clases",
  day_pass: "Pase de día",
};
