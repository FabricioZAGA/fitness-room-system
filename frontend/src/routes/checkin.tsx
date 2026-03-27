/**
 * Check-in page for gym reception.
 * Quick member lookup and status display with large, accessible buttons.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStudents } from "@/hooks/useStudents";
import { useMembershipsForStudent, useActiveMembership } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
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
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import type { Student } from "@/types/student";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
});

function CheckinPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data: studentsData } = useStudents({ limit: 100 });
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
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Check-in</h1>
        <p className="mt-1 text-lg text-slate-400">
          Busca al miembro por nombre o escanea su código QR
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Search Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedStudent(null);
              }}
              placeholder="Escribe el nombre del miembro..."
              autoFocus
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 py-5 pl-14 pr-4 text-xl text-white placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Search Results */}
          {showResults && (
            <div className="mt-4 space-y-2">
              {students.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No se encontraron miembros
                </p>
              ) : (
                students.map((student) => (
                  <button
                    key={student.student_id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      selectedStudent?.student_id === student.student_id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700 text-xl font-bold text-white">
                        {student.first_name.charAt(0)}
                        {student.last_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-white">
                          {student.full_name}
                        </p>
                        <p className="text-sm text-slate-400">{student.email}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-500" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Member Status Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {selectedStudent ? (
            <MemberStatusCard student={selectedStudent} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-slate-800 p-6">
                <User className="h-12 w-12 text-slate-600" />
              </div>
              <p className="text-xl text-slate-500">
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
  const { data: membership } = useActiveMembership(student.student_id);
  const { data: membershipsData } = useMembershipsForStudent(student.student_id);
  const { data: reservationsData } = useReservationsForStudent(student.student_id);
  const allMemberships = membershipsData?.items ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayReservations = (reservationsData?.items ?? []).filter(
    (r) => r.class_date === today && (r.status === "confirmed" || r.status === "waitlisted")
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
              ? "bg-amber-500/10 border-2 border-amber-500/30"
              : "bg-emerald-500/10 border-2 border-emerald-500/30"
            : "bg-red-500/10 border-2 border-red-500/30"
        }`}
      >
        <div className="flex items-center gap-4">
          {canEnter ? (
            isExpiringSoon ? (
              <AlertTriangle className="h-12 w-12 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            )
          ) : (
            <XCircle className="h-12 w-12 text-red-500" />
          )}
          <div>
            <p
              className={`text-2xl font-bold ${
                canEnter
                  ? isExpiringSoon
                    ? "text-amber-500"
                    : "text-emerald-500"
                  : "text-red-500"
              }`}
            >
              {canEnter
                ? isExpiringSoon
                  ? "⚠️ Acceso Permitido"
                  : "✅ Acceso Permitido"
                : "❌ Acceso Denegado"}
            </p>
            <p className="text-slate-400">
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
          </div>
        </div>
      </div>

      {/* Member Info */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
            {getInitials(student.full_name)}
          </div>
          <div>
            <p className="text-xl font-bold text-white">{student.full_name}</p>
            <p className="text-slate-400">{student.email}</p>
            {student.phone && <p className="text-slate-500">{student.phone}</p>}
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
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-400">Clases de hoy ({todayReservations.length})</p>
          <div className="space-y-1">
            {todayReservations.map((r) => (
              <div key={r.reservation_id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.class_date ?? "—"}</span>
                <span className={r.status === "confirmed" ? "text-emerald-400" : "text-amber-400"}>
                  {r.status === "confirmed" ? "Confirmada" : "En espera"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500">
          ✓ Registrar Check-in
        </button>
        <Link
          to="/students/$studentId"
          params={{ studentId: student.student_id }}
          className="rounded-xl border-2 border-slate-700 py-4 text-center text-lg font-semibold text-white transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Ver Perfil Completo
        </Link>
      </div>

      {/* Membership History */}
      {allMemberships.length > 1 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-400">
            Historial de membresías ({allMemberships.length})
          </p>
          <div className="space-y-2">
            {allMemberships.slice(0, 3).map((m) => (
              <div
                key={m.membership_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-300">{m.membership_type}</span>
                <span className="text-slate-500">
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
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    slate: "border-slate-700 bg-slate-800 text-slate-300",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <Icon className="mb-2 h-5 w-5" />
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
