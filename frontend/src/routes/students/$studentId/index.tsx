import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Calendar, Plus, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { useStudent, useActivateStudent, useDeactivateStudent } from "@/hooks/useStudents";
import { useMembershipsForStudent } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
import { StudentStatusBadge, MembershipStatusBadge, ReservationStatusBadge } from "@/components/shared/StatusBadge";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/students/$studentId/")({
  component: StudentDetailPage,
});

function StudentDetailPage(): React.JSX.Element {
  const { studentId } = Route.useParams();
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);

  const { data: student, isLoading } = useStudent(studentId);
  const { data: membershipsData } = useMembershipsForStudent(studentId);
  const memberships = membershipsData?.items ?? [];
  const { data: reservationsData } = useReservationsForStudent(studentId);
  const { mutate: activate, isPending: activating } = useActivateStudent();
  const { mutate: deactivate, isPending: deactivating } = useDeactivateStudent();

  const reservations = reservationsData?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-zinc-400">Alumno no encontrado.</p>
        <Link to="/students" className="text-xs text-violet-400 hover:text-violet-300">
          ← Volver a alumnos
        </Link>
      </div>
    );
  }

  const isActive = student.status === "active" || student.status === "founder";

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/students"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{student.full_name}</h1>
              <p className="mt-0.5 text-sm text-zinc-400">{student.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StudentStatusBadge status={student.status} />
            {isActive ? (
              <button
                onClick={() => deactivate(studentId)}
                disabled={deactivating}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
              >
                <PowerOff className="h-3.5 w-3.5" />
                Desactivar
              </button>
            ) : (
              <button
                onClick={() => activate(studentId)}
                disabled={activating}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-green-500/50 hover:text-green-400 disabled:opacity-50"
              >
                <Power className="h-3.5 w-3.5" />
                Activar
              </button>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Información personal
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            <InfoRow label="Nombre completo" value={student.full_name} />
            <InfoRow label="Correo" value={student.email} />
            <InfoRow label="Teléfono" value={student.phone ?? "—"} />
            <InfoRow label="Estado" value={<StudentStatusBadge status={student.status} />} />
            <InfoRow label="Registrado" value={formatDate(student.created_at)} />
            {student.notes && (
              <InfoRow label="Notas" value={student.notes} className="col-span-2" />
            )}
          </dl>
        </div>

        {/* Memberships */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Membresías
            </h2>
            <button
              onClick={() => setMembershipModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva membresía
            </button>
          </div>

          {!memberships || memberships.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="mb-2 h-8 w-8 text-zinc-700" />
              <p className="text-xs text-zinc-500">Sin membresías registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memberships.map((m) => (
                <div
                  key={m.membership_id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {MEMBERSHIP_TYPE_LABELS[m.membership_type]}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatDate(m.start_date)} → {formatDate(m.end_date)}
                      {m.classes_remaining !== null && (
                        <> · <span className="text-zinc-400">{m.classes_remaining} clases restantes</span></>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-300">
                      ${m.price_paid.toLocaleString("es-MX")}
                    </span>
                    <MembershipStatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reservation history */}
        <div className="card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Historial de reservaciones
          </h2>

          {reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-2 h-8 w-8 text-zinc-700" />
              <p className="text-xs text-zinc-500">Sin reservaciones registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="pb-2 text-xs font-medium text-zinc-500">Clase</th>
                  <th className="pb-2 text-xs font-medium text-zinc-500">Fecha</th>
                  <th className="pb-2 text-xs font-medium text-zinc-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {reservations.map((res) => (
                  <tr key={res.reservation_id}>
                    <td className="py-2.5 text-zinc-300">
                      {res.class_id ? (
                        <span className="font-mono text-xs text-zinc-500">{res.class_id.slice(0, 8)}…</span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      {res.class_date ? formatDate(res.class_date) : "—"}
                    </td>
                    <td className="py-2.5">
                      <ReservationStatusBadge status={res.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateMembershipModal
        open={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
        studentId={studentId}
      />
    </>
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
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}
