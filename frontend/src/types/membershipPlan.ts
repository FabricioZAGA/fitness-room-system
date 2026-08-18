/** TypeScript types for MembershipPlan — mirrors backend Pydantic models. */

export interface BlockedSchedule {
  day: string;
  start: string;
  end: string;
}

export interface MembershipPlan {
  slug: string;
  label: string;
  description: string;
  default_price: number;
  duration_days: number;
  sessions_per_day: number;
  total_sessions: number | null;
  allowed_days: string[];
  blocked_schedules: BlockedSchedule[];
  requires_partner: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanRequest {
  label: string;
  description?: string;
  default_price?: number;
  duration_days?: number;
  sessions_per_day?: number;
  total_sessions?: number | null;
  allowed_days?: string[];
  blocked_schedules?: BlockedSchedule[];
  requires_partner?: boolean;
  sort_order?: number;
}

export interface UpdatePlanRequest {
  label?: string;
  description?: string;
  default_price?: number;
  duration_days?: number;
  sessions_per_day?: number;
  total_sessions?: number | null;
  clear_total_sessions?: boolean;
  allowed_days?: string[];
  blocked_schedules?: BlockedSchedule[];
  requires_partner?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

/** Valid day abbreviations for allowed_days / blocked_schedules. */
export const VALID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayAbbr = (typeof VALID_DAYS)[number];

/** Day abbreviation → display label mapping. */
export const DAY_LABELS: Record<DayAbbr, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

/** Short day labels for compact display. */
export const DAY_SHORT_LABELS: Record<DayAbbr, string> = {
  mon: "L",
  tue: "M",
  wed: "Mi",
  thu: "J",
  fri: "V",
  sat: "S",
  sun: "D",
};
