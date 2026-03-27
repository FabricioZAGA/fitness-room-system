/** TypeScript types for the Reservation entity — mirrors backend Pydantic models. */

export type ReservationStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show";

export interface Reservation {
  reservation_id: string;
  student_id: string;
  class_id: string;
  status: ReservationStatus;
  waitlist_position: number | null;
  class_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationRequest {
  student_id: string;
  class_id: string;
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  waitlisted: "En lista de espera",
  cancelled: "Cancelada",
  attended: "Asistió",
  no_show: "No asistió",
};

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  waitlisted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  attended: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  no_show: "bg-red-500/20 text-red-400 border-red-500/30",
};
