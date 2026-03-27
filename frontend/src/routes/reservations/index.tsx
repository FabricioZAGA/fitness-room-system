import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Users } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useReservationsForClass } from "@/hooks/useReservations";
import { ReservationStatusBadge } from "@/components/shared/StatusBadge";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { formatDate, formatTime } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/reservations/")({
  component: ReservationsPage,
});

function ReservationsPage(): React.JSX.Element {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const { data: classesData, isLoading: classesLoading } = useClasses({
    upcoming_only: false,
    limit: 50,
  });
  const { data: reservationsData, isLoading: resLoading } =
    useReservationsForClass(selectedClassId);
  const reservations = reservationsData?.items ?? [];

  const classes = classesData?.items ?? [];
  const selectedClass = classes.find((c) => c.class_id === selectedClassId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Reservaciones</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Selecciona una clase para ver sus reservaciones
          </p>
        </div>
      </div>

      {/* Class selector */}
      <div className="card p-5">
        <label className="mb-2 block text-xs font-medium text-zinc-400">
          Clase
        </label>
        {classesLoading ? (
          <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-800" />
        ) : (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
          >
            <option value="">— Selecciona una clase —</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {CLASS_TYPE_LABELS[cls.class_type]} · {cls.instructor_name} ·{" "}
                {formatDate(cls.class_date)} {formatTime(cls.start_time)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Reservations list */}
      {!selectedClassId ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <CalendarCheck className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-400">
            Selecciona una clase para ver sus reservaciones
          </p>
        </div>
      ) : resLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-400">
            No hay reservaciones para esta clase
          </p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          {selectedClass && (
            <div className="flex flex-wrap gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-3 text-sm">
              <span className="text-zinc-400">
                Capacidad:{" "}
                <span className="font-medium text-zinc-200">
                  {selectedClass.capacity}
                </span>
              </span>
              <span className="text-zinc-400">
                Reservadas:{" "}
                <span className="font-medium text-zinc-200">
                  {selectedClass.reservations_count}
                </span>
              </span>
              <span className="text-zinc-400">
                Disponibles:{" "}
                <span
                  className={
                    selectedClass.available_spots === 0
                      ? "font-medium text-red-400"
                      : "font-medium text-green-400"
                  }
                >
                  {selectedClass.available_spots}
                </span>
              </span>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                    Estudiante ID
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                    Lista de espera
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                    Creada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {reservations.map((res) => (
                  <tr
                    key={res.reservation_id}
                    className="transition-colors hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-zinc-300">
                      {res.student_id}
                    </td>
                    <td className="px-5 py-3">
                      <ReservationStatusBadge status={res.status} />
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
                      {res.waitlist_position !== null
                        ? `#${res.waitlist_position}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {formatDate(res.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
