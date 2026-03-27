import { cn } from "@/lib/utils";
import type { StudentStatus } from "@/types/student";
import type { MembershipStatus } from "@/types/membership";
import type { ReservationStatus } from "@/types/reservation";

const STUDENT_STATUS_STYLES: Record<StudentStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inactive: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  founder: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  founder: "Fundador",
  new: "Nuevo",
};

const MEMBERSHIP_STATUS_STYLES: Record<MembershipStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

const RESERVATION_STATUS_STYLES: Record<ReservationStatus, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  waitlisted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  attended: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  no_show: "bg-red-500/15 text-red-400 border-red-500/30",
};

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  waitlisted: "Lista de espera",
  cancelled: "Cancelada",
  attended: "Asistió",
  no_show: "No asistió",
};

interface StudentStatusBadgeProps {
  status: StudentStatus;
}

interface MembershipStatusBadgeProps {
  status: MembershipStatus;
}

interface ReservationStatusBadgeProps {
  status: ReservationStatus;
}

function Badge({ label, className }: { label: string; className: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        className
      )}
    >
      {label}
    </span>
  );
}

export function StudentStatusBadge({ status }: StudentStatusBadgeProps): React.JSX.Element {
  return <Badge label={STUDENT_STATUS_LABELS[status]} className={STUDENT_STATUS_STYLES[status]} />;
}

export function MembershipStatusBadge({ status }: MembershipStatusBadgeProps): React.JSX.Element {
  return (
    <Badge label={MEMBERSHIP_STATUS_LABELS[status]} className={MEMBERSHIP_STATUS_STYLES[status]} />
  );
}

export function ReservationStatusBadge({
  status,
}: ReservationStatusBadgeProps): React.JSX.Element {
  return (
    <Badge
      label={RESERVATION_STATUS_LABELS[status]}
      className={RESERVATION_STATUS_STYLES[status]}
    />
  );
}
