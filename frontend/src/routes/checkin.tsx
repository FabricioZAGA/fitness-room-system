/**
 * Check-in page for gym reception.
 * Quick member lookup and status display with large, accessible buttons.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStudents, useCheckin } from "@/hooks/useStudents";
import { useMembershipsForStudent, useActiveMembership } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
import { useClasses } from "@/hooks/useClasses";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  CreditCard,
  Calendar,
  Clock,
  ArrowRight,
  ScanLine,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { CLASS_TYPE_LABELS } from "@/types/class";
import type { Student } from "@/types/student";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
});

function CheckinPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data: studentsData } = useStudents({ limit: 200 });
  const allStudents = studentsData?.items ?? [];
  
  // Client-side filtering for quick search
  const students = searchTerm.length >= 2
    ? allStudents.filter((s) =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  const showResults = searchTerm.length >= 2;

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">Check-in</h1>
          <p className="mt-1 text-lg text-[--tx-muted]">
            Busca al miembro por nombre o escanea su código QR
          </p>
        </div>
        <Link
          to="/checkin-kiosk"
          className="flex items-center gap-2 rounded-xl border-2 border-[--gold-bd] bg-[--gold-bg] px-5 py-3 font-semibold text-[--gold] transition-all hover:bg-[--gold] hover:text-[--gold-fg]"
        >
          <ScanLine className="h-5 w-5" />
          Kiosco QR
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Search Panel */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[--tx-disabled]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedStudent(null);
              }}
              placeholder="Escribe el nombre del miembro..."
              autoFocus
              className="w-full rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] py-5 pl-14 pr-4 text-xl text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            />
          </div>

          {/* Search Results */}
          {showResults && (
            <div className="mt-4 space-y-2">
              {students.length === 0 ? (
                <p className="py-8 text-center text-[--tx-disabled]">
                  No se encontraron miembros
                </p>
              ) : (
                students.map((student) => (
                  <button
                    key={student.student_id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      selectedStudent?.student_id === student.student_id
                        ? "border-[--gold] bg-[--gold-bg]"
                        : "border-[--bd-subtle] bg-[--bg-muted] hover:border-[--gold-bd]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[--bg-elevated] text-xl font-bold text-[--tx-primary]">
                        {student.first_name.charAt(0)}
                        {student.last_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-[--tx-primary]">
                          {student.full_name}
                        </p>
                        <p className="text-sm text-[--tx-muted]">{student.email}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[--tx-disabled]" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Member Status Panel */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          {selectedStudent ? (
            <MemberStatusCard student={selectedStudent} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-[--bg-muted] p-6">
                <User className="h-12 w-12 text-[--tx-disabled]" />
              </div>
              <p className="text-xl text-[--tx-disabled]">
                Selecciona un miembro para ver su estado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberStatusCard({ student }: { student: Student }): React.JSX.Element {
  const { mutate: registerCheckin, isPending: isCheckingIn } = useCheckin();
  const { data: membership } = useActiveMembership(student.student_id);
  const { data: membershipsData } = useMembershipsForStudent(student.student_id);
  const { data: reservationsData } = useReservationsForStudent(student.student_id);
  const { data: classesData } = useClasses({ limit: 200 });
  const allMemberships = membershipsData?.items ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayReservations = (reservationsData?.items ?? []).filter(
    (r) => r.class_date === today && (r.status === "confirmed" || r.status === "waitlisted")
  );
  const classMap = Object.fromEntries(
    (classesData?.items ?? []).map((c) => [
      c.class_id,
      { type: CLASS_TYPE_LABELS[c.class_type as keyof typeof CLASS_TYPE_LABELS] ?? c.class_type, time: c.start_time.slice(0, 5) },
    ])
  );

  const isActive = student.status === "active" || student.status === "founder";
  const hasMembership = !!membership;
  const daysUntilExpiry = membership?.days_until_expiry ?? 0;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  const classesRemaining = membership?.classes_remaining;

  const canEnter = isActive && hasMembership && daysUntilExpiry > 0;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div
        className={`rounded-xl p-6 ${
          canEnter
            ? isExpiringSoon
              ? "bg-[--color-warning-bg] border-2 border-[--color-warning-bd]"
              : "bg-[--color-success-bg] border-2 border-[--color-success-bd]"
            : "bg-[--color-danger-bg] border-2 border-[--color-danger-bd]"
        }`}
      >
        <div className="flex items-center gap-4">
          {canEnter ? (
            isExpiringSoon ? (
              <AlertTriangle className="h-12 w-12 text-[--color-warning]" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-[--color-success]" />
            )
          ) : (
            <XCircle className="h-12 w-12 text-[--color-danger]" />
          )}
          <div>
            <p
              className={`text-2xl font-bold ${
                canEnter
                  ? isExpiringSoon
                    ? "text-[--color-warning]"
                    : "text-[--color-success]"
                  : "text-[--color-danger]"
              }`}
            >
              {canEnter
                ? isExpiringSoon
                  ? "⚠️ Acceso Permitido"
                  : "✅ Acceso Permitido"
                : "❌ Acceso Denegado"}
            </p>
            <p className="text-[--tx-muted]">
              {!isActive
                ? "El miembro está inactivo"
                : !hasMembership
                  ? "No tiene membresía activa"
                  : daysUntilExpiry <= 0
                    ? "La membresía ha expirado"
                    : isExpiringSoon
                      ? `Vence en ${daysUntilExpiry} días`
                      : "Todo en orden"}
            </p>
            {isExpiringSoon && student && (
              <Link
                to="/students/$studentId"
                params={{ studentId: student.student_id }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-4 py-2 text-sm font-semibold text-[--gold] transition-all hover:bg-[--gold] hover:text-[--gold-fg]"
              >
                <CreditCard className="h-4 w-4" />
                Renovar aquí
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Member Info */}
      <div className="rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-5">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            {getInitials(student.full_name)}
          </div>
          <div>
            <p className="text-xl font-bold text-[--tx-primary]">{student.full_name}</p>
            <p className="text-[--tx-muted]">{student.email}</p>
            {student.phone && <p className="text-[--tx-disabled]">{student.phone}</p>}
          </div>
        </div>
      </div>

      {/* Membership Info */}
      {membership && (
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard
            icon={CreditCard}
            label="Membresía"
            value={MEMBERSHIP_TYPE_LABELS[membership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] ?? membership.membership_type}
            color="emerald"
          />
          <InfoCard
            icon={Calendar}
            label="Vence"
            value={formatDate(membership.end_date)}
            color={isExpiringSoon ? "amber" : "slate"}
          />
          {classesRemaining !== null && classesRemaining !== undefined && (
            <InfoCard
              icon={Clock}
              label="Clases restantes"
              value={classesRemaining.toString()}
              color={classesRemaining <= 2 ? "amber" : "emerald"}
            />
          )}
        </div>
      )}

      {/* Today's reservations */}
      {todayReservations.length > 0 && (
        <div className="rounded-xl border border-[--color-info-bd] bg-[--color-info-bg] p-4">
          <p className="mb-2 text-sm font-semibold text-[--color-info]">Clases de hoy ({todayReservations.length})</p>
          <div className="space-y-1">
            {todayReservations.map((r) => {
              const cls = classMap[r.class_id ?? ""];
              return (
                <div key={r.reservation_id} className="flex items-center justify-between text-sm">
                  <span className="text-[--tx-primary]">
                    {cls ? `${cls.type} · ${cls.time}` : (r.class_date ?? "—")}
                  </span>
                  <span className={r.status === "confirmed" ? "text-[--color-success]" : "text-[--color-warning]"}>
                    {r.status === "confirmed" ? "Confirmada" : "En espera"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => registerCheckin(student.student_id)}
          disabled={!canEnter || isCheckingIn}
          className="rounded-xl py-4 text-lg font-semibold text-[--tx-primary] transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: canEnter ? "var(--gold)" : "var(--bg-muted)",
            color: canEnter ? "var(--gold-fg)" : "var(--tx-disabled)",
          }}
        >
          {isCheckingIn ? "Registrando..." : "✓ Registrar Check-in"}
        </button>
        <Link
          to="/students/$studentId"
          params={{ studentId: student.student_id }}
          className="rounded-xl border-2 border-[--bd-subtle] py-4 text-center text-lg font-semibold text-[--tx-primary] transition-colors hover:border-[--bd-default] hover:bg-[--bg-muted]"
        >
          Ver Perfil Completo
        </Link>
      </div>

      {/* Membership History */}
      {allMemberships.length > 1 && (
        <div className="rounded-xl border border-[--bd-subtle] bg-[--bg-muted]/50 p-4">
          <p className="mb-3 text-sm font-medium text-[--tx-muted]">
            Historial de membresías ({allMemberships.length})
          </p>
          <div className="space-y-2">
            {allMemberships.slice(0, 3).map((m) => (
              <div
                key={m.membership_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[--tx-primary]">{m.membership_type}</span>
                <span className="text-[--tx-disabled]">
                  {formatDate(m.start_date)} - {formatDate(m.end_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: "emerald" | "amber" | "slate";
}): React.JSX.Element {
  const colorClasses = {
    emerald: "border-[--color-success-bd] bg-[--color-success-bg] text-[--color-success]",
    amber: "border-[--color-warning-bd] bg-[--color-warning-bg] text-[--color-warning]",
    slate: "border-[--bd-subtle] bg-[--bg-muted] text-[--tx-primary]",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <Icon className="mb-2 h-5 w-5" />
      <p className="text-xs text-[--tx-disabled]">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
