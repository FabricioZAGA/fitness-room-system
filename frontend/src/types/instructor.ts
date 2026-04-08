/** Instructor entity types. */

export type InstructorStatus = "active" | "inactive" | "on_leave";

export interface Instructor {
  instructor_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: InstructorStatus;
  specialties: string[];
  bio: string | null;
  photo_url: string | null;
  hourly_rate: number | null;
  classes_this_week: number;
  total_classes_taught: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInstructorRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialties?: string[];
  bio?: string;
  photo_url?: string;
  hourly_rate?: number;
}

export interface UpdateInstructorRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: InstructorStatus;
  specialties?: string[];
  bio?: string;
  photo_url?: string;
  hourly_rate?: number;
}

export const INSTRUCTOR_STATUS_LABELS: Record<InstructorStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  on_leave: "Licencia",
};

export const INSTRUCTOR_STATUS_COLORS: Record<InstructorStatus, string> = {
  active: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  inactive: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
  on_leave: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
};
