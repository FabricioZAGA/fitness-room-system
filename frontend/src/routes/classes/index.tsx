import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Plus } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from "@/types/class";
import { formatDate, formatTime } from "@/lib/utils";

export const Route = createFileRoute("/classes/")({
  component: ClassesPage,
});

function ClassesPage(): React.JSX.Element {
  const { data, isLoading } = useClasses({ upcoming_only: false, limit: 50 });
  const classes = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Clases</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {data?.total ?? 0} clase{data?.total !== 1 ? "s" : ""} registrada{data?.total !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500">
          <Plus className="h-4 w-4" />
          Nueva Clase
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : classes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-400">No hay clases registradas</p>
          <p className="mt-1 text-xs text-zinc-600">Crea la primera clase del calendario</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => (
            <div key={cls.class_id} className="card p-5 transition-colors hover:border-zinc-700">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CLASS_TYPE_COLORS[cls.class_type]}`}
                  >
                    {CLASS_TYPE_LABELS[cls.class_type]}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">{cls.instructor_name}</p>
                  <p className="text-xs text-zinc-400">
                    {formatDate(cls.class_date)} · {formatTime(cls.start_time)}
                  </p>
                </div>
                {cls.is_cancelled && (
                  <span className="text-xs font-medium text-red-400">Cancelada</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>{cls.location}</span>
                <span className={cls.available_spots === 0 ? "text-red-400" : "text-green-400"}>
                  {cls.reservations_count}/{cls.capacity} reservaciones
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
