/** TypeScript types for the Membership entity — mirrors backend Pydantic models. */

export type MembershipType =
  | "founder"
  | "room_daily"
  | "room_elite"
  | "room_flex"
  | "room_pass";

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
  founder: "Socio Fundador",
  room_daily: "Room Daily",
  room_elite: "Room Elite",
  room_flex: "Room Flex",
  room_pass: "Room Pass",
};

/** Recommended price per plan (MXN). Editable in the create modal. */
export const MEMBERSHIP_DEFAULT_PRICE: Record<MembershipType, number> = {
  founder: 950,
  room_daily: 1300,
  room_elite: 1600,
  room_flex: 1150,
  room_pass: 150,
};
