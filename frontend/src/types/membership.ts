/** TypeScript types for the Membership entity — mirrors backend Pydantic models. */

import type { PaymentSplit } from "./transaction";

/** Well-known membership plan slugs (seeded from backend). */
export type KnownMembershipType =
  | "founder"
  | "room_daily"
  | "room_elite"
  | "room_flex"
  | "room_pass"
  | "room_duo"
  | "kilo_a_kilo"
  | "courtesy";

/**
 * membership_type is now a free-form plan slug.
 * Dynamic plans created in the admin UI won't be in the union above,
 * so we widen to `string` while keeping known slugs for autocomplete.
 */
export type MembershipType = KnownMembershipType | (string & {});

export type MembershipStatus = "active" | "frozen" | "expired" | "cancelled" | "pending";

export interface Membership {
  membership_id: string;
  student_id: string;
  membership_type: string;
  status: MembershipStatus;
  start_date: string;
  end_date: string;
  price_paid: number;
  classes_total: number | null;
  classes_remaining: number | null;
  days_until_expiry: number | null;
  notes: string | null;
  duo_partner_id: string | null;
  duo_partner_name: string | null;
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
  membership_type: string;
  start_date: string;
  end_date: string;
  price_paid: number;
  payment_method?: string;
  /** Required when payment_method is "mixed". */
  payment_splits?: PaymentSplit[];
  classes_total?: number;
  notes?: string;
  duo_partner_id?: string;
}

export interface UpdateMembershipRequest {
  start_date?: string;
  end_date?: string;
  membership_type?: string;
  status?: MembershipStatus;
  price_paid?: number;
  payment_method?: string;
  payment_splits?: PaymentSplit[];
  classes_total?: number;
  classes_remaining?: number;
  notes?: string;
  duo_partner_id?: string;
  duo_partner_name?: string;
}

/** Static fallback labels for known membership types. */
export const MEMBERSHIP_TYPE_LABELS: Record<KnownMembershipType, string> = {
  founder: "Socio Fundador",
  room_daily: "Room Daily",
  room_elite: "Room Elite",
  room_flex: "Room Flex",
  room_pass: "Room Pass",
  room_duo: "Room Dúo",
  kilo_a_kilo: "Kilo a Kilo",
  courtesy: "Cortesía",
};

/** Static fallback prices for known membership types (MXN). */
export const MEMBERSHIP_DEFAULT_PRICE: Record<KnownMembershipType, number> = {
  founder: 950,
  room_daily: 1300,
  room_elite: 1600,
  room_flex: 1150,
  room_pass: 150,
  room_duo: 1100,
  kilo_a_kilo: 3000,
  courtesy: 0,
};
