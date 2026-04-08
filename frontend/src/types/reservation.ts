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
  confirmed: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  waitlisted: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
  cancelled: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
  attended: "bg-[--color-primary-bg] text-[--color-primary] border-[--color-primary-bd]",
  no_show: "bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-bd]",
};
