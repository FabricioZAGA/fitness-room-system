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
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  on_leave: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
