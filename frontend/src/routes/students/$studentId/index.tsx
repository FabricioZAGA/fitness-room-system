import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, CreditCard, Calendar, Plus, Power, PowerOff,
  Pencil, Mail, Phone, User, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useStudent, useActivateStudent, useDeactivateStudent } from "@/hooks/useStudents";
import { useMembershipsForStudent } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
import { useClasses } from "@/hooks/useClasses";
import { StudentStatusBadge, MembershipStatusBadge, ReservationStatusBadge } from "@/components/shared/StatusBadge";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { EditStudentModal } from "@/components/shared/EditStudentModal";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";

export const Route = createFileRoute("/students/$studentId/")({
  component: StudentDetailPage,
});

const ATTENDANCE_ICON: Record<string, React.ReactNode> = {
  attended: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  no_show:  <XCircle className="h-4 w-4 text-red-400" />,
  confirmed: <Clock className="h-4 w-4 text-amber-400" />,
  waitlisted: <Clock className="h-4 w-4 text-slate-500" />,
  cancelled:  <XCircle className="h-4 w-4 text-slate-500" />,
};

function StudentDetailPage(): React.JSX.Element {
  const { studentId } = Route.useParams();
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: student, isLoading } = useStudent(studentId);
  const { data: membershipsData } = useMembershipsForStudent(studentId);
  const memberships = membershipsData?.items ?? [];
  const { data: reservationsData } = useReservationsForStudent(studentId);
  const reservations = reservationsData?.items ?? [];
  const { data: classesData } = useClasses({ limit: 200 });
  const { mutate: activate, isPending: activating } = useActivateStudent();
  const { mutate: deactivate, isPending: deactivating } = useDeactivateStudent();

  const classMap = useMemo(() => {
    const map: Record<string, { type: string; date: string; instructor: string }> = {};
    for (const c of classesData?.items ?? []) {
      map[c.class_id] = {
        type: c.class_type,
        date: c.class_date,
        instructor: c.instructor_name,
      };
    }
    return map;
  }, [classesData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg text-slate-400">Miembro no encontrado.</p>
        <Link to="/students" className="text-emerald-400 hover:text-emerald-300">
          ← Volver a miembros
        </Link>
      </div>
    );
  }

  const isActive = student.status === "active" || student.status === "founder";
  const activeMembership = memberships.find((m) => m.status === "active");
  const attendedCount = reservations.filter((r) => r.status === "attended").length;

  return (
    <>
      <div className="min-h-screen bg-slate-950 p-6">
        {/* Back */}
        <Link
          to="/students"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a miembros
        </Link>

        {/* Hero header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-emerald-500/20">
              {getInitials(student.full_name)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{student.full_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{student.email}</span>
                {student.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{student.phone}</span>
                )}
              </div>
              <div className="mt-2"><StudentStatusBadge status={student.status} /></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            {isActive ? (
              <button
                onClick={() => deactivate(studentId)}
                disabled={deactivating}
                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
              >
                <PowerOff className="h-4 w-4" />
                Desactivar
              </button>
            ) : (
              <button
                onClick={() => activate(studentId)}
                disabled={activating}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Power className="h-4 w-4" />
                Activar
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<CreditCard className="h-6 w-6 text-emerald-400" />}
            label="Membresía activa"
            value={activeMembership ? MEMBERSHIP_TYPE_LABELS[activeMembership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] : "Sin membresía"}
            sub={activeMembership ? `Vence ${formatDate(activeMembership.end_date)}` : "Asigna una membresía"}
            color="emerald"
          />
          <StatCard
            icon={<Calendar className="h-6 w-6 text-blue-400" />}
            label="Reservaciones"
            value={String(reservations.length)}
            sub={`${attendedCount} asistencias`}
            color="blue"
          />
          <StatCard
            icon={<User className="h-6 w-6 text-slate-400" />}
            label="Miembro desde"
            value={formatDate(student.created_at)}
            sub={student.notes ?? "Sin notas"}
            color="slate"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Memberships */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Membresías</h2>
              <button
                onClick={() => setMembershipModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva
              </button>
            </div>

            {memberships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-slate-700" />
                <p className="text-slate-400">Sin membresías registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberships.map((m) => (
                  <div
                    key={m.membership_id}
                    className={`rounded-xl border p-4 transition-all ${
                      m.status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-slate-800 bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">
                        {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
                      </p>
                      <MembershipStatusBadge status={m.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{formatDate(m.start_date)} → {formatDate(m.end_date)}</span>
                      <span className="font-medium text-white">{formatCurrency(m.price_paid)}</span>
                      {m.classes_remaining !== null && (
                        <span className="text-emerald-400">{m.classes_remaining} clases restantes</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reservation history */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-base font-semibold text-white">
              Historial de clases
              {reservations.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-400">
                  {reservations.length}
                </span>
              )}
            </h2>

            {reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="mb-3 h-10 w-10 text-slate-700" />
                <p className="text-slate-400">Sin reservaciones registradas</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {reservations.map((res) => {
                  const cls = classMap[res.class_id ?? ""];
                  return (
                    <div
                      key={res.reservation_id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span>{ATTENDANCE_ICON[res.status] ?? ATTENDANCE_ICON["confirmed"]}</span>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {cls
                              ? CLASS_TYPE_LABELS[cls.type as keyof typeof CLASS_TYPE_LABELS] ?? cls.type
                              : "Clase"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {cls ? formatDate(cls.date) : res.class_date ? formatDate(res.class_date) : "—"}
                            {cls && <span className="ml-2 text-slate-600">· {cls.instructor}</span>}
                          </p>
                        </div>
                      </div>
                      <ReservationStatusBadge status={res.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <CreateMembershipModal
        open={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
        studentId={studentId}
      />
      <EditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
      />
    </>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "blue" | "slate";
}): React.JSX.Element {
  const border = { emerald: "border-emerald-500/20 bg-emerald-500/5", blue: "border-blue-500/20 bg-blue-500/5", slate: "border-slate-700 bg-slate-800/50" }[color];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 ${border}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-white">{value}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

export { InfoRow };
