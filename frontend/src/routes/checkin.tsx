/**
 * Check-in page for gym reception.
 * Scrollable member list with live search + class selector.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStudents, useCheckinWithAttendance } from "@/hooks/useStudents";
import { useActiveMembership, useMembershipsForStudent } from "@/hooks/useMemberships";
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
  ScanLine,
  CalendarCheck,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { CLASS_TYPE_LABELS } from "@/types/class";
import type { Student } from "@/types/student";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
});

function CheckinPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data: studentsData } = useStudents({ limit: 200 });
  const allStudents = studentsData?.items ?? [];

  const filteredStudents = searchTerm.trim().length >= 1
    ? allStudents
        .filter(
          (s) =>
            s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 20)
    : allStudents.slice(0, 20);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
  };

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">{t("checkin.title")}</h1>
          <p className="mt-1 text-[--tx-muted]">
            {t("checkin.subtitle")}
          </p>
        </div>
        <Link
          to="/checkin-kiosk"
          className="flex items-center gap-2 rounded-xl border-2 border-[--gold-bd] bg-[--gold-bg] px-5 py-3 font-semibold text-[--gold] transition-all hover:bg-[--gold] hover:text-[--gold-fg]"
        >
          <ScanLine className="h-5 w-5" />
          {t("checkin.kioskQR")}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* ── Left: member list ── */}
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[--tx-disabled]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("checkin.searchByCriteria")}
              autoFocus
              className="w-full rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] py-3.5 pl-12 pr-4 text-base text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            />
          </div>

          {/* Student list */}
          <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
            <div className="border-b border-[--bd-subtle] px-4 py-3">
              <p className="text-xs font-medium text-[--tx-muted]">
                {searchTerm.trim()
                  ? `${filteredStudents.length} resultados`
                  : `${filteredStudents.length} miembros`}
              </p>
            </div>

            <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="py-12 text-center text-[--tx-disabled]">
                  {t("checkin.noMembersFound")}
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.student_id}
                    onClick={() => handleSelectStudent(student)}
                    className={`w-full border-b border-[--bd-subtle] px-4 py-3.5 text-left transition-all last:border-b-0 hover:bg-[--bg-muted] ${
                      selectedStudent?.student_id === student.student_id
                        ? "bg-[--gold-bg] hover:bg-[--gold-bg]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          background:
                            selectedStudent?.student_id === student.student_id
                              ? "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"
                              : "var(--bg-elevated)",
                          color:
                            selectedStudent?.student_id === student.student_id
                              ? "var(--gold-fg)"
                              : "var(--tx-primary)",
                        }}
                      >
                        {getInitials(student.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[--tx-primary]">
                          {student.full_name}
                        </p>
                        <p className="truncate text-xs text-[--tx-muted]">
                          {student.email}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          student.status === "active"
                            ? "bg-[--color-success-bg] text-[--color-success]"
                            : student.status === "suspended"
                              ? "bg-[--color-warning-bg] text-[--color-warning]"
                              : "bg-[--color-danger-bg] text-[--color-danger]"
                        }`}
                      >
                        {student.status === "active" ? t("common.active") : student.status === "suspended" ? t("common.suspended") : t("common.inactive")}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right: status + class select ── */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          {selectedStudent ? (
            <MemberStatusCard
              key={selectedStudent.student_id}
              student={selectedStudent}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-[--bg-muted] p-6">
                <User className="h-12 w-12 text-[--tx-disabled]" />
              </div>
              <p className="text-lg text-[--tx-disabled]">
                {t("checkin.selectMemberList")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Member status + class selector ──────────────────────────────────────────

function MemberStatusCard({ student }: { student: Student }): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const { mutate: doCheckin, isPending, isSuccess } = useCheckinWithAttendance();
  const { data: membership } = useActiveMembership(student.student_id);
  const { data: membershipsData } = useMembershipsForStudent(student.student_id);
  const { data: reservationsData, isLoading: reservationsLoading } =
    useReservationsForStudent(student.student_id);
  const { data: classesData } = useClasses({ limit: 200 });

  const allMemberships = membershipsData?.items ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const todayReservations = (reservationsData?.items ?? []).filter(
    (r) => r.class_date === today && r.status === "confirmed"
  );

  const classMap = Object.fromEntries(
    (classesData?.items ?? []).map((c) => [
      c.class_id,
      {
        type: CLASS_TYPE_LABELS[c.class_type as keyof typeof CLASS_TYPE_LABELS] ?? c.class_type,
        time: c.start_time.slice(0, 5),
        location: c.location,
      },
    ])
  );

  const isActive = student.status === "active";
  const hasMembership = !!membership;
  const daysUntilExpiry = membership?.days_until_expiry ?? 0;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  const classesRemaining = membership?.classes_remaining;

  const canEnter = isActive && hasMembership && daysUntilExpiry > 0;
  const hasClassToday = todayReservations.length > 0;
  const canCheckin = canEnter && hasClassToday && !!selectedClassId && !isSuccess;

  const handleCheckin = () => {
    if (!selectedClassId) return;
    doCheckin({ studentId: student.student_id, classId: selectedClassId });
  };

  return (
    <div className="space-y-5">
      {/* ── Access status banner ── */}
      <div
        className={`rounded-xl border-2 p-5 ${
          canEnter
            ? isExpiringSoon
              ? "border-[--color-warning-bd] bg-[--color-warning-bg]"
              : "border-[--color-success-bd] bg-[--color-success-bg]"
            : "border-[--color-danger-bd] bg-[--color-danger-bg]"
        }`}
      >
        <div className="flex items-center gap-4">
          {canEnter ? (
            isExpiringSoon ? (
              <AlertTriangle className="h-10 w-10 shrink-0 text-[--color-warning]" />
            ) : (
              <CheckCircle2 className="h-10 w-10 shrink-0 text-[--color-success]" />
            )
          ) : (
            <XCircle className="h-10 w-10 shrink-0 text-[--color-danger]" />
          )}
          <div>
            <p
              className={`text-xl font-bold ${
                canEnter
                  ? isExpiringSoon
                    ? "text-[--color-warning]"
                    : "text-[--color-success]"
                  : "text-[--color-danger]"
              }`}
            >
              {canEnter
                ? isExpiringSoon
                  ? t("checkin.accessWarning")
                  : t("checkin.accessGranted")
                : t("checkin.accessDenied")}
            </p>
            <p className="text-sm text-[--tx-muted]">
              {!isActive
                ? t("checkin.memberInactive")
                : !hasMembership
                  ? t("checkin.noActiveMembership")
                  : daysUntilExpiry <= 0
                    ? t("checkin.membershipExpired")
                    : isExpiringSoon
                      ? t("checkin.expiresIn", { days: daysUntilExpiry })
                      : t("checkin.allGood")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Member info ── */}
      <div className="flex items-center gap-4 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            color: "var(--gold-fg)",
          }}
        >
          {getInitials(student.full_name)}
        </div>
        <div>
          <p className="text-lg font-bold text-[--tx-primary]">{student.full_name}</p>
          <p className="text-sm text-[--tx-muted]">{student.email}</p>
          {student.phone && <p className="text-xs text-[--tx-disabled]">{student.phone}</p>}
        </div>
      </div>

      {/* ── Membership cards ── */}
      {membership && (
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard
            icon={CreditCard}
            label={t("checkin.membership")}
            value={
              MEMBERSHIP_TYPE_LABELS[
                membership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS
              ] ?? membership.membership_type
            }
            color="emerald"
          />
          <InfoCard
            icon={Calendar}
            label={t("checkin.expires")}
            value={formatDate(membership.end_date)}
            color={isExpiringSoon ? "amber" : "slate"}
          />
          {classesRemaining !== null && classesRemaining !== undefined && (
            <InfoCard
              icon={Clock}
              label={t("checkin.classesRemaining")}
              value={classesRemaining.toString()}
              color={classesRemaining <= 2 ? "amber" : "emerald"}
            />
          )}
        </div>
      )}

      {/* ── Class selector (only shown when access is allowed) ── */}
      {canEnter && (
        <div className="rounded-xl border border-[--bd-default] bg-[--bg-elevated] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[--gold]" />
            <p className="text-sm font-semibold text-[--tx-primary]">
              {t("checkin.selectClass")}
            </p>
          </div>

          {reservationsLoading ? (
            <p className="text-sm text-[--tx-disabled]">{t("checkin.loadingClasses")}</p>
          ) : !hasClassToday ? (
            <div className="rounded-xl border border-[--color-warning-bd] bg-[--color-warning-bg] px-4 py-3">
              <p className="text-sm font-medium text-[--color-warning]">
                ⚠️ {t("checkin.noClassesToday")}
              </p>
              <p className="mt-0.5 text-xs text-[--tx-muted]">
                {t("checkin.noReservationWarning")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayReservations.map((r) => {
                const cls = classMap[r.class_id ?? ""];
                const isSelected = selectedClassId === r.class_id;
                return (
                  <button
                    key={r.class_id}
                    onClick={() => setSelectedClassId(r.class_id ?? null)}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                      isSelected
                        ? "border-[--gold] bg-[--gold-bg]"
                        : "border-[--bd-subtle] bg-[--bg-muted] hover:border-[--gold-bd]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${isSelected ? "text-[--gold]" : "text-[--tx-primary]"}`}>
                          {cls ? cls.type : r.class_id}
                        </p>
                        {cls && (
                          <p className="text-xs text-[--tx-muted]">
                            {cls.time} · {cls.location}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === "confirmed"
                              ? "bg-[--color-success-bg] text-[--color-success]"
                              : "bg-[--color-warning-bg] text-[--color-warning]"
                          }`}
                        >
                          {r.status === "confirmed" ? t("checkin.confirmed") : t("checkin.waiting")}
                        </span>
                        {isSelected && (
                          <div
                            className="h-5 w-5 rounded-full flex items-center justify-center"
                            style={{ background: "var(--gold)", color: "var(--gold-fg)" }}
                          >
                            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Success state ── */}
      {isSuccess && (
        <div className="rounded-xl border-2 border-[--color-success-bd] bg-[--color-success-bg] p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-[--color-success]" />
          <p className="font-semibold text-[--color-success]">{t("checkin.checkinRegistered")}</p>
          <p className="text-xs text-[--tx-muted]">
            {selectedClassId && classMap[selectedClassId]
              ? `${classMap[selectedClassId].type} · ${classMap[selectedClassId].time}`
              : ""}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      {!isSuccess && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={handleCheckin}
            disabled={!canCheckin || isPending}
            className="rounded-xl py-4 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: canCheckin ? "var(--gold)" : "var(--bg-muted)",
              color: canCheckin ? "var(--gold-fg)" : "var(--tx-disabled)",
            }}
          >
            {isPending ? t("checkin.registering") : t("checkin.registerCheckin")}
          </button>
          <Link
            to="/students/$studentId"
            params={{ studentId: student.student_id }}
            className="rounded-xl border-2 border-[--bd-subtle] py-4 text-center text-base font-semibold text-[--tx-primary] transition-colors hover:border-[--bd-default] hover:bg-[--bg-muted]"
          >
            {t("checkin.viewProfile")}
          </Link>
        </div>
      )}

      {/* ── Membership history ── */}
      {allMemberships.length > 1 && (
        <div className="rounded-xl border border-[--bd-subtle] bg-[--bg-muted]/50 p-4">
          <p className="mb-3 text-xs font-medium text-[--tx-muted]">
            Historial de membresías ({allMemberships.length})
          </p>
          <div className="space-y-2">
            {allMemberships.slice(0, 3).map((m) => (
              <div key={m.membership_id} className="flex items-center justify-between text-sm">
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
