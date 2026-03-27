import { createFileRoute } from "@tanstack/react-router";
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

function ReservationsPage(): React.JSX.Element {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: classesData, isLoading: classesLoading } = useClasses({
    upcoming_only: false,
    limit: 50,
  });
  const { data: reservationsData, isLoading: resLoading } =
    useReservationsForClass(selectedClassId);
  const reservations = reservationsData?.items ?? [];

  const { data: studentsData } = useStudents({ limit: 200 });
  const studentMap = useMemo(() => {
    const map: Record<string, { name: string; initials: string }> = {};
    for (const s of studentsData?.items ?? []) {
      map[s.student_id] = {
        name: s.full_name,
        initials: getInitials(s.full_name),
      };
    }
    return map;
  }, [studentsData]);

  const { mutate: cancelReservation } = useCancelReservation();
  const { mutate: markAttendance } = useMarkAttendance();

  const classes = classesData?.items ?? [];
  const selectedClass = classes.find((c) => c.class_id === selectedClassId);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reservaciones</h1>
          <p className="mt-1 text-lg text-slate-400">
            Gestiona las reservaciones de cada clase
          </p>
        </div>
      </div>

      {/* Class selector */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <label className="mb-3 block text-sm font-medium text-slate-300">
          Selecciona una clase
        </label>
        {classesLoading ? (
          <div className="h-14 w-full animate-pulse rounded-xl bg-slate-800" />
        ) : (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-4 text-base text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">— Selecciona una clase —</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {CLASS_TYPE_LABELS[cls.class_type]} · {cls.instructor_name} ·{" "}
                {formatDate(cls.class_date)} {formatTime(cls.start_time)} ({cls.reservations_count}/{cls.capacity})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Reservations content */}
      {!selectedClassId ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 py-20 text-center">
          <CalendarCheck className="mx-auto mb-4 h-16 w-16 text-slate-700" />
          <p className="text-xl text-slate-400">
            Selecciona una clase para ver y gestionar sus reservaciones
          </p>
        </div>
      ) : resLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Summary bar + Add button */}
          {selectedClass && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-slate-500">Capacidad</p>
                  <p className="text-2xl font-bold text-white">{selectedClass.capacity}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reservadas</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {selectedClass.reservations_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Disponibles</p>
                  <p
                    className={`text-2xl font-bold ${
                      selectedClass.available_spots === 0
                        ? "text-amber-400"
                        : "text-white"
                    }`}
                  >
                    {selectedClass.available_spots}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
              >
                <UserPlus className="h-5 w-5" />
                Añadir Miembro
              </button>
            </div>
          )}

          {reservations.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 py-16 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-slate-700" />
              <p className="text-lg text-slate-400">
                No hay reservaciones para esta clase
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white"
              >
                <Plus className="h-5 w-5" />
                Añadir primer miembro
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
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
                        {member ? member.initials : res.student_id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {member ? member.name : `ID: ${res.student_id.slice(0, 8)}...`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ReservationStatusBadge status={res.status} />
                          {res.waitlist_position !== null && (
                            <span className="text-xs text-amber-400">
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
                            className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition-colors hover:bg-emerald-500/20"
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
                            className="rounded-lg bg-amber-500/10 p-2 text-amber-400 transition-colors hover:bg-amber-500/20"
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
                        className="rounded-lg bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
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
