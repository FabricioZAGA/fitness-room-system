/** TypeScript types for the Class entity — mirrors backend Pydantic models. */

export type ClassType =
  | "hyrox"
  | "strong_nation"
  | "entrenamiento_funcional"
  | "yoga"
  | "mat"
  | "zumba"
  | "other";

export type ClassMode = "presencial" | "virtual";

export const CLASS_MODE_LABELS: Record<ClassMode, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
};

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
  class_mode: ClassMode;
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
  class_mode?: ClassMode;
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
  class_mode?: ClassMode;
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
  hyrox: "Hyrox",
  strong_nation: "Strong Nation",
  entrenamiento_funcional: "Entrenamiento Funcional",
  yoga: "Yoga",
  mat: "Mat",
  zumba: "Zumba",
  other: "Otra",
};

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  hyrox: "bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-bd]",
  strong_nation: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
  entrenamiento_funcional: "bg-[--color-primary-bg] text-[--color-primary] border-[--color-primary-bd]",
  yoga: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  mat: "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]",
  zumba: "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]",
  other: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
};
