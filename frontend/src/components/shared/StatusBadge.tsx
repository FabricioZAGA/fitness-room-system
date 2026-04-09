import { cn } from "@/lib/utils";
import type { StudentStatus } from "@/types/student";
import type { MembershipStatus } from "@/types/membership";
import type { ReservationStatus } from "@/types/reservation";

const STUDENT_STATUS_STYLES: Record<StudentStatus, string> = {
  active: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  inactive: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
  founder: "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]",
  new: "bg-[--color-primary-bg] text-[--color-primary] border-[--color-primary-bd]",
};

const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  founder: "Fundador",
  new: "Nuevo",
};

const MEMBERSHIP_STATUS_STYLES: Record<MembershipStatus, string> = {
  active: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  frozen: "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]",
  expired: "bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-bd]",
  cancelled: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
  pending: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
};

const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  frozen: "Congelada",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

const RESERVATION_STATUS_STYLES: Record<ReservationStatus, string> = {
  confirmed: "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]",
  waitlisted: "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]",
  cancelled: "bg-[--tx-disabled-bg] text-[--tx-disabled] border-[--tx-disabled-bd]",
  attended: "bg-[--color-primary-bg] text-[--color-primary] border-[--color-primary-bd]",
  no_show: "bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-bd]",
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
