import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  List,
  Plus,
  UserPlus,
  MapPin,
  Users,
  Clock,
  Link as LinkIcon,
  XCircle,
} from "lucide-react";
import { useClasses, useCancelClass } from "@/hooks/useClasses";
import { CreateClassModal } from "@/components/shared/CreateClassModal";
import { ClassCalendar } from "@/components/shared/ClassCalendar";
import { AddToClassModal } from "@/components/shared/AddToClassModal";
import { CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from "@/types/class";
import type { FitnessClass } from "@/types/class";
import { formatDate, formatTime } from "@/lib/utils";

export const Route = createFileRoute("/classes/")({
  component: ClassesPage,
});

type ViewMode = "calendar" | "list";

function ClassesPage(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedClass, setSelectedClass] = useState<FitnessClass | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data, isLoading } = useClasses({ upcoming_only: false, limit: 200 });
  const { mutate: cancelClass } = useCancelClass();
  const classes = data?.items ?? [];

  function handleClassClick(cls: FitnessClass): void {
    setSelectedClass(cls);
  }

  function handleAddMember(cls: FitnessClass): void {
    setSelectedClass(cls);
    setAddMemberOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Clases</h1>
          <p className="mt-1 text-lg text-slate-400">
            {data?.total ?? 0} clase{data?.total !== 1 ? "s" : ""} registrada{data?.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-700 bg-slate-800 p-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "calendar"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Calendario
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "list"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5" />
            Nueva Clase
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 py-20 text-center">
          <Calendar className="mx-auto mb-4 h-16 w-16 text-slate-700" />
          <p className="text-xl text-slate-400">No hay clases registradas</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white"
          >
            <Plus className="h-5 w-5" />
            Crear primera clase
          </button>
        </div>
      ) : viewMode === "calendar" ? (
        /* ── CALENDAR VIEW ── */
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <ClassCalendar
            classes={classes}
            onClassClick={handleClassClick}
          />

          {/* Detail panel */}
          {selectedClass ? (
            <ClassDetailPanel
              cls={selectedClass}
              onAddMember={() => handleAddMember(selectedClass)}
              onCancel={() => {
                cancelClass(selectedClass.class_id);
                setSelectedClass(null);
              }}
              onClose={() => setSelectedClass(null)}
            />
          ) : (
            <div className="hidden xl:flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <Calendar className="mb-4 h-14 w-14 text-slate-700" />
              <p className="text-slate-500">
                Selecciona una clase del calendario para ver detalles
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="space-y-3">
          {classes.map((cls) => (
            <div
              key={cls.class_id}
              className={`flex items-center justify-between rounded-2xl border p-5 transition-all ${
                cls.is_cancelled
                  ? "border-slate-800/50 bg-slate-900/50 opacity-60"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-5">
                {/* Type badge */}
                <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${CLASS_TYPE_COLORS[cls.class_type]}`}>
                  {CLASS_TYPE_LABELS[cls.class_type]}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {cls.instructor_name}
                    {cls.is_cancelled && (
                      <span className="ml-2 text-sm font-normal text-red-400">Cancelada</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span>{formatDate(cls.class_date)} · {formatTime(cls.start_time)}</span>
                    {cls.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {cls.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-lg font-bold ${cls.available_spots === 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {cls.reservations_count}/{cls.capacity}
                  </p>
                  <p className="text-xs text-slate-500">reservaciones</p>
                </div>
                {!cls.is_cancelled && (
                  <button
                    onClick={() => handleAddMember(cls)}
                    className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    title="Añadir miembro"
                  >
                    <UserPlus className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateClassModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AddToClassModal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        selectedClass={selectedClass}
      />
    </div>
  );
}

function ClassDetailPanel({
  cls,
  onAddMember,
  onCancel,
  onClose,
}: {
  cls: FitnessClass;
  onAddMember: () => void;
  onCancel: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const occupancyPct = Math.round((cls.reservations_count / cls.capacity) * 100);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <span className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${CLASS_TYPE_COLORS[cls.class_type]}`}>
          {CLASS_TYPE_LABELS[cls.class_type]}
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:text-white transition-colors"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <h3 className="mb-1 text-xl font-bold text-white">{cls.instructor_name}</h3>
      {cls.is_cancelled && (
        <p className="mb-3 text-sm font-medium text-red-400">Clase cancelada</p>
      )}

      {/* Details */}
      <div className="mb-6 space-y-3">
        <DetailRow icon={Calendar} label="Fecha" value={formatDate(cls.class_date)} />
        <DetailRow icon={Clock} label="Hora" value={`${formatTime(cls.start_time)} (${cls.duration_minutes ?? 60} min)`} />
        <DetailRow icon={MapPin} label="Lugar" value={cls.location ?? "Sin especificar"} />
        {cls.class_link && (
          <DetailRow icon={LinkIcon} label="Enlace" value="Ver clase en línea" link={cls.class_link} />
        )}
      </div>

      {/* Occupancy */}
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            Ocupación
          </div>
          <span className="text-lg font-bold text-white">
            {cls.reservations_count}/{cls.capacity}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${
              occupancyPct >= 90 ? "bg-red-500" : occupancyPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {cls.available_spots > 0
            ? `${cls.available_spots} lugares disponibles`
            : "Clase llena — lista de espera activa"}
        </p>
      </div>

      {/* Actions */}
      {!cls.is_cancelled && (
        <div className="space-y-3">
          <button
            onClick={onAddMember}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
          >
            <UserPlus className="h-5 w-5" />
            Añadir Miembro
          </button>
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500/30 py-3 text-sm font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/10"
          >
            <XCircle className="h-4 w-4" />
            Cancelar clase
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  link?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="w-16 shrink-0 text-slate-500">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
          {value}
        </a>
      ) : (
        <span className="text-white">{value}</span>
      )}
    </div>
  );
}
