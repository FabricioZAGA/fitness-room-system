import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Plus, UserPlus, Users, XCircle, CheckCircle2, Clock } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useReservationsForClass, useCancelReservation, useMarkAttendance } from "@/hooks/useReservations";
import { ReservationStatusBadge } from "@/components/shared/StatusBadge";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import { useState, useMemo } from "react";
import { AddToClassModal } from "@/components/shared/AddToClassModal";

export const Route = createFileRoute("/reservations/")({
  component: ReservationsPage,
});

type DateFilter = "today" | "week" | "all";

function ReservationsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const weekEnd = new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

  const { data: classesData, isLoading: classesLoading } = useClasses({
    upcoming_only: false,
    limit: 200,
  });
  const { data: reservationsData, isLoading: resLoading } =
    useReservationsForClass(selectedClassId);
  const reservations = reservationsData?.items ?? [];

  const { data: studentsData } = useStudents({ limit: 200 });
  const studentMap = useMemo(() => {
    const map: Record<string, { name: string; initials: string; photo_url: string | null }> = {};
    for (const s of studentsData?.items ?? []) {
      map[s.student_id] = {
        name: s.full_name,
        initials: getInitials(s.full_name),
        photo_url: s.photo_url,
      };
    }
    return map;
  }, [studentsData]);

  const { mutate: cancelReservation } = useCancelReservation();
  const { mutate: markAttendance } = useMarkAttendance();

  const allClasses = classesData?.items ?? [];
  const classes = allClasses.filter((c) => {
    if (dateFilter === "today") return c.class_date === today;
    if (dateFilter === "week") return c.class_date >= today && c.class_date <= weekEnd;
    return true;
  });
  const selectedClass = allClasses.find((c) => c.class_id === selectedClassId);

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">{t("reservations.title")}</h1>
          <p className="mt-1 text-lg text-[--tx-muted]">
            {t("reservations.manageDesc")}
          </p>
        </div>
      </div>

      {/* Date filter + Class selector */}
      <div className="mb-6 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
        {/* Quick filters */}
        <div className="mb-4 flex gap-2">
          {(["today", "week", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setDateFilter(f); setSelectedClassId(""); }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                dateFilter === f
                  ? "shadow-lg"
                  : "border border-[--bd-subtle] bg-[--bg-muted] text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary]"
              }`}
              style={
                dateFilter === f
                  ? {
                      background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                      color: "var(--gold-fg)",
                      boxShadow: "0 10px 25px var(--gold-bg)"
                    }
                  : undefined
              }
            >
              {f === "today" ? t("reservations.filterToday") : f === "week" ? t("reservations.filterWeek") : t("reservations.filterAll")}
            </button>
          ))}
          {dateFilter === "today" && (
            <span className="ml-2 flex items-center text-sm text-[--tx-disabled]">
              {today}
            </span>
          )}
        </div>

        <label className="mb-3 block text-sm font-medium text-[--tx-primary]">
          Selecciona una clase{classes.length > 0 ? ` (${classes.length})` : ""}
        </label>
        {classesLoading ? (
          <div className="h-14 w-full animate-pulse rounded-xl bg-[--bg-muted]" />
        ) : classes.length === 0 ? (
          <div className="rounded-xl bg-[--bg-muted]/30 py-6 text-center">
            <p className="text-[--tx-disabled]">
              {dateFilter === "today" ? t("reservations.noClassesToday") : dateFilter === "week" ? t("reservations.noClassesWeek") : t("reservations.noClassesAll")}
            </p>
          </div>
        ) : (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] px-4 py-4 text-base text-[--tx-primary] focus:border-[--gold] focus:outline-none"
          >
            <option value="">— Selecciona una clase —</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {CLASS_TYPE_LABELS[cls.class_type]} · {cls.instructor_name} ·{" "}
                {formatDate(cls.class_date)} {formatTime(cls.start_time)} ({cls.reservations_count}/{cls.capacity})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Reservations content */}
      {!selectedClassId ? (
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] py-20 text-center">
          <CalendarCheck className="mx-auto mb-4 h-16 w-16 text-[--tx-disabled]" />
          <p className="text-xl text-[--tx-muted]">
            {t("reservations.selectClassPrompt")}
          </p>
        </div>
      ) : resLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Summary bar + Add button */}
          {selectedClass && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-[--tx-disabled]">{t("reservations.capacity")}</p>
                  <p className="text-2xl font-bold text-[--tx-primary]">{selectedClass.capacity}</p>
                </div>
                <div>
                  <p className="text-xs text-[--tx-disabled]">{t("reservations.reservedCount")}</p>
                  <p className="text-2xl font-bold text-[--color-success]">
                    {selectedClass.reservations_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[--tx-disabled]">{t("reservations.available")}</p>
                  <p
                    className={`text-2xl font-bold ${
                      selectedClass.available_spots === 0
                        ? "text-[--color-warning]"
                        : "text-[--tx-primary]"
                    }`}
                  >
                    {selectedClass.available_spots}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 25px var(--gold-bg)"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
              >
                <UserPlus className="h-5 w-5" />
                {t("reservations.addMember")}
              </button>
            </div>
          )}

          {reservations.length === 0 ? (
            <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] py-16 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-[--tx-disabled]" />
              <p className="text-lg text-[--tx-muted]">
                {t("reservations.noReservations")}
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)"
                }}
              >
                <Plus className="h-5 w-5" />
                {t("reservations.addFirst")}
              </button>
            </div>
          ) : (
            /* Reservations List */
            <div className="space-y-3">
              {reservations.map((res) => {
                const member = studentMap[res.student_id];
                return (
                  <div
                    key={res.reservation_id}
                    className="flex items-center justify-between rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                        {member?.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[--color-success-bg] text-sm font-bold text-[--color-success]">
                            {member ? member.initials : res.student_id.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-[--tx-primary]">
                          {member ? member.name : `ID: ${res.student_id.slice(0, 8)}...`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ReservationStatusBadge status={res.status} />
                          {res.waitlist_position !== null && (
                            <span className="text-xs text-[--color-warning]">
                              Lista de espera #{res.waitlist_position}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {res.status === "confirmed" && (
                        <>
                          <button
                            onClick={() =>
                              markAttendance({
                                classId: selectedClassId,
                                studentId: res.student_id,
                                attended: true,
                              })
                            }
                            className="rounded-lg bg-[--color-success-bg] p-2 text-[--color-success] transition-colors hover:bg-[--color-success-bg]"
                            title="Marcar asistencia"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              markAttendance({
                                classId: selectedClassId,
                                studentId: res.student_id,
                                attended: false,
                              })
                            }
                            className="rounded-lg bg-[--color-warning-bg] p-2 text-[--color-warning] transition-colors hover:bg-[--color-warning-bg]"
                            title="Marcar no-show"
                          >
                            <Clock className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          cancelReservation({
                            classId: selectedClassId,
                            studentId: res.student_id,
                          })
                        }
                        className="rounded-lg bg-[--color-danger-bg] p-2 text-[--color-danger] transition-colors hover:bg-[--color-danger-bg]"
                        title="Cancelar reservación"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add to Class Modal */}
      <AddToClassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedClass={selectedClass ?? null}
      />
    </div>
  );
}
