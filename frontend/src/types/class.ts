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
  zumba: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  strong: "bg-red-500/20 text-red-400 border-red-500/30",
  yoga: "bg-green-500/20 text-green-400 border-green-500/30",
  hiit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pilates: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cycling: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  other: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};
