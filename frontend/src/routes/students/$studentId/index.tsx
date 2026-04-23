import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, CreditCard, Calendar, Plus, Power, PowerOff,
  Pencil, Mail, Phone, User, CheckCircle2, XCircle, Clock,
  Snowflake, QrCode, Download, ShieldBan, ShieldCheck,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useStudent, useActivateStudent, useDeactivateStudent, useSuspendStudent, useUnsuspendStudent, useStudentQr } from "@/hooks/useStudents";
import { useMembershipsForStudent, useFreezeMembership, useUnfreezeMembership } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
import { useClasses } from "@/hooks/useClasses";
import { StudentStatusBadge, MembershipStatusBadge, ReservationStatusBadge } from "@/components/shared/StatusBadge";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { EditStudentModal } from "@/components/shared/EditStudentModal";
import { Dialog } from "@/components/shared/Dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";

export const Route = createFileRoute("/students/$studentId/")({
  component: StudentDetailPage,
});

const ATTENDANCE_ICON: Record<string, React.ReactNode> = {
  attended: <CheckCircle2 className="h-4 w-4 text-[--color-success]" />,
  no_show:  <XCircle className="h-4 w-4 text-[--color-danger]" />,
  confirmed: <Clock className="h-4 w-4 text-[--color-warning]" />,
  waitlisted: <Clock className="h-4 w-4 text-[--tx-disabled]" />,
  cancelled:  <XCircle className="h-4 w-4 text-[--tx-disabled]" />,
};

function StudentDetailPage(): React.JSX.Element {
  const { studentId } = Route.useParams();
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeMembershipId, setFreezeMembershipId] = useState<string | null>(null);
  const [freezeDays, setFreezeDays] = useState(14);
  const [qrOpen, setQrOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);

  const { data: student, isLoading } = useStudent(studentId);
  const { data: membershipsData } = useMembershipsForStudent(studentId);
  const memberships = membershipsData?.items ?? [];
  const { data: reservationsData } = useReservationsForStudent(studentId);
  const reservations = reservationsData?.items ?? [];
  const { data: classesData } = useClasses({ limit: 200 });
  const { mutate: activate, isPending: activating } = useActivateStudent();
  const { mutate: deactivate, isPending: deactivating } = useDeactivateStudent();
  const { mutate: suspend, isPending: suspending } = useSuspendStudent();
  const { mutate: unsuspend, isPending: unsuspending } = useUnsuspendStudent();
  const { mutate: freeze, isPending: freezing } = useFreezeMembership();
  const { mutate: unfreeze, isPending: unfreezing } = useUnfreezeMembership();
  const { data: qrData } = useStudentQr(qrOpen ? studentId : "");

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg text-[--tx-muted]">Miembro no encontrado.</p>
        <Link to="/students" className="text-[--gold] hover:text-[--gold-hover]">
          ← Volver a miembros
        </Link>
      </div>
    );
  }

  const isActive = student.status === "active";
  const isSuspended = student.status === "suspended";
  const isInactive = student.status === "inactive";
  const activeMembership = memberships.find((m) => m.status === "active");
  const attendedCount = reservations.filter((r) => r.status === "attended").length;

  return (
    <>
      <div className="min-h-screen bg-[--bg-base] p-6">
        {/* Back */}
        <Link
          to="/students"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[--tx-muted] hover:text-[--tx-primary] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a miembros
        </Link>

        {/* Hero header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 25px var(--gold-bg)"
                }}>
                {getInitials(student.full_name)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-[--tx-primary]">{student.full_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[--tx-muted]">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{student.email}</span>
                {student.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{student.phone}</span>
                )}
                {student.age !== null && student.age !== undefined && (
                  <span className="text-[--tx-disabled]">{student.age} años</span>
                )}
                {student.city && (
                  <span className="text-[--tx-disabled]">{student.city}</span>
                )}
              </div>
              {student.address && (
                <p className="mt-1 text-xs text-[--tx-disabled]">{student.address}</p>
              )}
              {student.emergency_contact && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[--color-warning-bd] bg-[--color-warning-bg] px-3 py-1.5 text-xs">
                  <span className="font-medium text-[--color-warning]">Emergencia:</span>
                  <span className="text-[--tx-primary]">{student.emergency_contact.name} ({student.emergency_contact.relationship})</span>
                  <span className="text-[--tx-muted]">{student.emergency_contact.phone}</span>
                </div>
              )}
              <div className="mt-2"><StudentStatusBadge status={student.status} /></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
            >
              <QrCode className="h-4 w-4" />
              QR
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--bd-default] hover:text-[--tx-primary]"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>

            {isActive && (
              <>
                <button
                  onClick={() => setSuspendConfirmOpen(true)}
                  disabled={suspending}
                  className="flex items-center gap-2 rounded-xl border border-[--color-warning-bd] bg-[--color-warning-bg] px-4 py-2.5 text-sm font-medium text-[--color-warning] transition-all disabled:opacity-50"
                >
                  <ShieldBan className="h-4 w-4" />
                  Suspender
                </button>
                <button
                  onClick={() => setDeactivateConfirmOpen(true)}
                  disabled={deactivating}
                  className="flex items-center gap-2 rounded-xl border border-[--color-danger-bd] bg-[--color-danger-bg] px-4 py-2.5 text-sm font-medium text-[--color-danger] transition-all disabled:opacity-50"
                >
                  <PowerOff className="h-4 w-4" />
                  Desactivar
                </button>
              </>
            )}

            {isSuspended && (
              <button
                onClick={() => unsuspend(studentId)}
                disabled={unsuspending}
                className="flex items-center gap-2 rounded-xl border border-[--color-success-bd] bg-[--color-success-bg] px-4 py-2.5 text-sm font-medium text-[--color-success] transition-all disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Reactivar
              </button>
            )}

            {isInactive && (
              <button
                onClick={() => activate(studentId)}
                disabled={activating}
                className="flex items-center gap-2 rounded-xl border border-[--color-success-bd] bg-[--color-success-bg] px-4 py-2.5 text-sm font-medium text-[--color-success] transition-all disabled:opacity-50"
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
            icon={<CreditCard className="h-6 w-6 text-[--color-success]" />}
            label="Membresía activa"
            value={activeMembership ? MEMBERSHIP_TYPE_LABELS[activeMembership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] : "Sin membresía"}
            sub={activeMembership ? `Vence ${formatDate(activeMembership.end_date)}` : "Asigna una membresía"}
            color="emerald"
          />
          <StatCard
            icon={<Calendar className="h-6 w-6 text-[--color-info]" />}
            label="Reservaciones"
            value={String(reservations.length)}
            sub={`${attendedCount} asistencias`}
            color="blue"
          />
          <StatCard
            icon={<User className="h-6 w-6 text-[--tx-muted]" />}
            label="Miembro desde"
            value={formatDate(student.created_at)}
            sub={student.notes ?? "Sin notas"}
            color="slate"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Memberships */}
          <section className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[--tx-primary]">Membresías</h2>
              <button
                onClick={() => setMembershipModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)"
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva
              </button>
            </div>

            {memberships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-[--tx-disabled]" />
                <p className="text-[--tx-muted]">Sin membresías registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberships.map((m) => (
                  <div
                    key={m.membership_id}
                    className={`rounded-xl border p-4 transition-all ${
                      m.status === "active"
                        ? "border-[--color-success-bd] bg-[--color-success-bg]"
                        : m.status === "frozen"
                        ? "border-[--color-info-bd] bg-[--color-info-bg]"
                        : "border-[--bd-default] bg-[--bg-muted]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[--tx-primary]">
                        {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
                      </p>
                      <div className="flex items-center gap-2">
                        <MembershipStatusBadge status={m.status} />
                        {m.status === "active" && (
                          <button
                            onClick={() => { setFreezeMembershipId(m.membership_id); setFreezeOpen(true); }}
                            className="flex items-center gap-1 rounded-lg border border-[--color-info-bd] bg-[--color-info-bg] px-2 py-1 text-xs font-medium text-[--color-info] transition-all hover:opacity-80"
                          >
                            <Snowflake className="h-3 w-3" />
                            Congelar
                          </button>
                        )}
                        {m.status === "frozen" && (
                          <button
                            onClick={() => unfreeze({ studentId, membershipId: m.membership_id })}
                            disabled={unfreezing}
                            className="flex items-center gap-1 rounded-lg border border-[--color-success-bd] bg-[--color-success-bg] px-2 py-1 text-xs font-medium text-[--color-success] transition-all hover:opacity-80 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Reactivar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[--tx-muted]">
                      <span>{formatDate(m.start_date)} → {formatDate(m.end_date)}</span>
                      <span className="font-medium text-[--tx-primary]">{formatCurrency(m.price_paid)}</span>
                      {m.classes_remaining !== null && (
                        <span className="text-[--color-success]">{m.classes_remaining} clases restantes</span>
                      )}
                      {m.is_frozen && m.freeze_end_date && (
                        <span className="flex items-center gap-1 text-[--color-info]">
                          <Snowflake className="h-3 w-3" />
                          Congelada hasta {formatDate(m.freeze_end_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reservation history */}
          <section className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
            <h2 className="mb-5 text-base font-semibold text-[--tx-primary]">
              Historial de clases
              {reservations.length > 0 && (
                <span className="ml-2 rounded-full bg-[--bg-muted] px-2 py-0.5 text-xs font-normal text-[--tx-muted]">
                  {reservations.length}
                </span>
              )}
            </h2>

            {reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="mb-3 h-10 w-10 text-[--tx-disabled]" />
                <p className="text-[--tx-muted]">Sin reservaciones registradas</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {reservations.map((res) => {
                  const cls = classMap[res.class_id ?? ""];
                  return (
                    <div
                      key={res.reservation_id}
                      className="flex items-center justify-between rounded-xl border border-[--bd-default] bg-[--bg-muted]/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span>{ATTENDANCE_ICON[res.status] ?? ATTENDANCE_ICON["confirmed"]}</span>
                        <div>
                          <p className="text-sm font-medium text-[--tx-primary]">
                            {cls
                              ? CLASS_TYPE_LABELS[cls.type as keyof typeof CLASS_TYPE_LABELS] ?? cls.type
                              : "Clase"}
                          </p>
                          <p className="text-xs text-[--tx-disabled]">
                            {cls ? formatDate(cls.date) : res.class_date ? formatDate(res.class_date) : "—"}
                            {cls && <span className="ml-2 text-[--tx-disabled]">· {cls.instructor}</span>}
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

      {/* Freeze membership modal */}
      <Dialog open={freezeOpen} onClose={() => setFreezeOpen(false)} title="Congelar Membresía">
        <div className="space-y-5">
          <p className="text-sm text-[--tx-muted]">
            La membresía será suspendida y la fecha de vencimiento se extenderá por los días
            seleccionados. Ideal para lesiones, viajes o imprevistos.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              Días a congelar
            </label>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 21, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setFreezeDays(d)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                  style={
                    freezeDays === d
                      ? { background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)", color: "var(--gold-fg)" }
                      : { border: "1px solid var(--bd-default)", background: "var(--bg-muted)", color: "var(--tx-muted)" }
                  }
                >
                  {d} días
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={180}
              value={freezeDays}
              onChange={(e) => setFreezeDays(Math.max(1, Math.min(180, Number(e.target.value))))}
              className="mt-3 w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
              placeholder="O escribe días personalizados (1-180)"
            />
          </div>
          <div className="rounded-xl border border-[--color-info-bd] bg-[--color-info-bg] p-3 text-xs text-[--color-info]">
            La fecha de vencimiento se extenderá <strong>{freezeDays} días</strong> automáticamente.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setFreezeOpen(false)}
              className="rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm text-[--tx-muted] transition-all hover:border-[--bd-subtle] hover:text-[--tx-primary]"
            >
              Cancelar
            </button>
            <button
              disabled={freezing || !freezeMembershipId}
              onClick={() => {
                if (!freezeMembershipId) return;
                freeze(
                  { studentId, membershipId: freezeMembershipId, data: { days: freezeDays } },
                  { onSuccess: () => setFreezeOpen(false) }
                );
              }}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              <Snowflake className="h-4 w-4" />
              {freezing ? "Congelando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={deactivateConfirmOpen}
        onClose={() => setDeactivateConfirmOpen(false)}
        onConfirm={() => {
          deactivate(studentId);
          setDeactivateConfirmOpen(false);
        }}
        title="Desactivar miembro"
        description={`¿Desactivar a ${student.full_name}? Su membresía activa será cancelada automáticamente. Para volver, deberás activarlo y asignar una nueva membresía.`}
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivating}
      />

      {/* Suspend confirmation */}
      <ConfirmDialog
        open={suspendConfirmOpen}
        onClose={() => setSuspendConfirmOpen(false)}
        onConfirm={() => {
          suspend(studentId);
          setSuspendConfirmOpen(false);
        }}
        title="Suspender miembro"
        description={`¿Suspender temporalmente a ${student.full_name}? Su membresía activa será congelada automáticamente. Cuando lo reactives, su membresía se descongelará.`}
        confirmLabel="Suspender"
        variant="warning"
        loading={suspending}
      />

      {/* QR modal */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} title={`Código QR — ${student.full_name}`}>
        <div className="flex flex-col items-center gap-5">
          <p className="text-center text-sm text-[--tx-muted]">
            El alumno puede mostrar este código en la recepción o kiosco para hacer check-in.
          </p>
          {qrData ? (
            <>
              <div className="rounded-2xl border-4 border-[--gold] bg-white p-2">
                <img
                  src={`data:${qrData.mime_type};base64,${qrData.qr_base64}`}
                  alt={`QR de ${qrData.student_name}`}
                  className="h-56 w-56"
                />
              </div>
              <a
                href={`data:${qrData.mime_type};base64,${qrData.qr_base64}`}
                download={`qr_${studentId}.png`}
                className="flex items-center gap-2 rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
              >
                <Download className="h-4 w-4" />
                Descargar QR
              </a>
            </>
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-[--bd-default] bg-[--bg-muted]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
            </div>
          )}
        </div>
      </Dialog>
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
  const border = { emerald: "border-[--color-success-bd] bg-[--color-success-bg]", blue: "border-[--color-info-bd] bg-[--color-info-bg]", slate: "border-[--bd-subtle] bg-[--bg-muted]/50" }[color];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 ${border}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-[--tx-disabled]">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-[--tx-primary]">{value}</p>
        <p className="truncate text-xs text-[--tx-disabled]">{sub}</p>
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
      <dt className="text-xs text-[--tx-disabled]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[--tx-primary]">{value}</dd>
    </div>
  );
}

export { InfoRow };
