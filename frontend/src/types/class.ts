/** TypeScript types for the Class entity — mirrors backend Pydantic models. */

export type ClassType =
  | "zumba"
  | "strong"
  | "yoga"
  | "hiit"
  | "pilates"
  | "cycling"
  | "other";

export interface FitnessClass {
  class_id: string;
  class_type: ClassType;
  instructor_name: string;
  class_date: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  reservations_count: number;
  waitlist_count: number;
  available_spots: number;
  location: string;
  description: string | null;
  class_link: string | null;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClassRequest {
  class_type: ClassType;
  instructor_name: string;
  class_date: string;
  start_time: string;
  duration_minutes?: number;
  capacity?: number;
  location?: string;
  description?: string;
  class_link?: string;
}

export interface UpdateClassRequest {
  instructor_name?: string;
  class_date?: string;
  start_time?: string;
  duration_minutes?: number;
  capacity?: number;
  location?: string;
  description?: string;
  class_link?: string;
  is_cancelled?: boolean;
}

export interface ClassAttendee {
  student_id: string;
  reservation_id: string;
  status: "confirmed" | "waitlisted";
  waitlist_position: number | null;
  created_at: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  full_name?: string;
}

export interface ClassAttendees {
  class_id: string;
  class_type: ClassType;
  instructor_name: string;
  class_date: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  location: string | null;
  description: string | null;
  is_cancelled: boolean;
  reservations_count: number;
  waitlist_count: number;
  available_spots: number;
  confirmed: ClassAttendee[];
  waitlisted: ClassAttendee[];
}

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  zumba: "Zumba",
  strong: "STRONG",
  yoga: "Yoga",
  hiit: "HIIT",
  pilates: "Pilates",
  cycling: "Cycling",
  other: "Otra",
};

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  zumba: "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]",
  strong: "bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-bd]",
  yoga: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  hiit: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
  pilates: "bg-[--color-primary-bg] text-[--color-primary] border-[--color-primary-bd]",
  cycling: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
  other: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
};
