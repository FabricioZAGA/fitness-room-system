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
import { useClasses, useCancelClass, useClassAttendees } from "@/hooks/useClasses";
import { CreateClassModal } from "@/components/shared/CreateClassModal";
import { ClassCalendar } from "@/components/shared/ClassCalendar";
import { AddToClassModal } from "@/components/shared/AddToClassModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const { data, isLoading } = useClasses({ upcoming_only: false, limit: 200 });
  const { mutate: cancelClass, isPending: cancelling } = useCancelClass();
  const classes = data?.items ?? [];

  function handleClassClick(cls: FitnessClass): void {
    setSelectedClass(cls);
  }

  function handleAddMember(cls: FitnessClass): void {
    setSelectedClass(cls);
    setAddMemberOpen(true);
  }

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">Clases</h1>
          <p className="mt-1 text-lg text-[--tx-muted]">
            {data?.total ?? 0} clase{data?.total !== 1 ? "s" : ""} registrada{data?.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "calendar"
                  ? "shadow-lg"
                  : "text-[--tx-muted] hover:text-[--tx-primary]"
              }`}
              style={
                viewMode === "calendar"
                  ? {
                      background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                      color: "var(--gold-fg)"
                    }
                  : undefined
              }
            >
              <Calendar className="h-4 w-4" />
              Calendario
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "list"
                  ? "shadow-lg"
                  : "text-[--tx-muted] hover:text-[--tx-primary]"
              }`}
              style={
                viewMode === "list"
                  ? {
                      background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                      color: "var(--gold-fg)"
                    }
                  : undefined
              }
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 25px var(--gold-bg)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
          >
            <Plus className="h-5 w-5" />
            Nueva Clase
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] py-20 text-center">
          <Calendar className="mx-auto mb-4 h-16 w-16 text-[--tx-disabled]" />
          <p className="text-xl text-[--tx-muted]">No hay clases registradas</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)"
            }}
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
              onCancel={() => setCancelConfirmOpen(true)}
              onClose={() => setSelectedClass(null)}
            />
          ) : (
            <div className="hidden xl:flex flex-col items-center justify-center rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-8 text-center">
              <Calendar className="mb-4 h-14 w-14 text-[--tx-disabled]" />
              <p className="text-[--tx-disabled]">
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
                  ? "border-[--bd-default]/50 bg-[--bg-surface]/50 opacity-60"
                  : "border-[--bd-default] bg-[--bg-surface] hover:border-[--bd-subtle]"
              }`}
            >
              <div className="flex items-center gap-5">
                {/* Type badge */}
                <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${CLASS_TYPE_COLORS[cls.class_type]}`}>
                  {CLASS_TYPE_LABELS[cls.class_type]}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[--tx-primary]">
                    {cls.instructor_name}
                    {cls.is_cancelled && (
                      <span className="ml-2 text-sm font-normal text-[--color-danger]">Cancelada</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[--tx-muted]">
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
                  <p className={`text-lg font-bold ${cls.available_spots === 0 ? "text-[--color-warning]" : "text-[--color-success]"}`}>
                    {cls.reservations_count}/{cls.capacity}
                  </p>
                  <p className="text-xs text-[--tx-disabled]">reservaciones</p>
                </div>
                {!cls.is_cancelled && (
                  <button
                    onClick={() => handleAddMember(cls)}
                    className="rounded-xl bg-[--color-success-bg] p-3 text-[--color-success] hover:bg-[--color-success-bg] transition-colors"
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

      {selectedClass && (
        <ConfirmDialog
          open={cancelConfirmOpen}
          onClose={() => setCancelConfirmOpen(false)}
          onConfirm={() => {
            cancelClass(selectedClass.class_id);
            setCancelConfirmOpen(false);
            setSelectedClass(null);
          }}
          title="Cancelar clase"
          description={`¿Estás seguro de cancelar esta clase? Todos los alumnos inscritos serán notificados y sus reservaciones serán canceladas.`}
          confirmLabel="Cancelar clase"
          variant="danger"
          loading={cancelling}
        />
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
  const { data: attendees, isLoading: attendeesLoading } = useClassAttendees(cls.class_id);

  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] overflow-y-auto max-h-[calc(100vh-120px)]">
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <span className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${CLASS_TYPE_COLORS[cls.class_type]}`}>
            {CLASS_TYPE_LABELS[cls.class_type]}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[--tx-disabled] hover:text-[--tx-primary] transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <h3 className="mb-1 text-xl font-bold text-[--tx-primary]">{cls.instructor_name}</h3>
        {cls.is_cancelled && (
          <p className="mb-3 text-sm font-medium text-[--color-danger]">Clase cancelada</p>
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
        <div className="mb-6 rounded-xl border border-[--bd-subtle] bg-[--bg-muted]/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[--tx-muted]">
              <Users className="h-4 w-4" />
              Ocupación
            </div>
            <span className="text-lg font-bold text-[--tx-primary]">
              {cls.reservations_count}/{cls.capacity}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[--bd-subtle]">
            <div
              className={`h-full rounded-full transition-all ${
                occupancyPct >= 90 ? "bg-[--color-danger]" : occupancyPct >= 70 ? "bg-[--color-warning]" : "bg-[--color-success]"
              }`}
              style={{ width: `${Math.min(occupancyPct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[--tx-disabled]">
            {cls.available_spots > 0
              ? `${cls.available_spots} lugares disponibles`
              : "Clase llena — lista de espera activa"}
          </p>
        </div>

        {/* Enrolled students */}
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[--tx-muted]">
            <Users className="h-4 w-4" />
            Inscritos ({attendees?.confirmed.length ?? cls.reservations_count})
          </h4>
          {attendeesLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[--gold] border-t-transparent" />
            </div>
          ) : attendees && attendees.confirmed.length > 0 ? (
            <div className="space-y-2">
              {attendees.confirmed.map((a) => (
                <div
                  key={a.reservation_id}
                  className="flex items-center gap-3 rounded-lg border border-[--bd-subtle] bg-[--bg-muted]/30 px-3 py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[--color-success-bg] text-xs font-bold text-[--color-success]">
                    {(a.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[--tx-primary]">{a.full_name || "Sin nombre"}</p>
                    <p className="truncate text-xs text-[--tx-disabled]">{a.email || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-[--tx-disabled]">Sin inscripciones aún</p>
          )}
        </div>

        {/* Waitlisted students */}
        {attendees && attendees.waitlisted.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[--color-warning]">
              <Clock className="h-4 w-4" />
              Lista de espera ({attendees.waitlisted.length})
            </h4>
            <div className="space-y-2">
              {attendees.waitlisted.map((a) => (
                <div
                  key={a.reservation_id}
                  className="flex items-center gap-3 rounded-lg border border-[--bd-subtle] bg-[--bg-muted]/30 px-3 py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[--color-warning-bg] text-xs font-bold text-[--color-warning]">
                    #{a.waitlist_position ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[--tx-primary]">{a.full_name || "Sin nombre"}</p>
                    <p className="truncate text-xs text-[--tx-disabled]">{a.email || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!cls.is_cancelled && (
          <div className="space-y-3">
            <button
              onClick={onAddMember}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
                boxShadow: "0 10px 25px var(--gold-bg)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
            >
              <UserPlus className="h-5 w-5" />
              Añadir Miembro
            </button>
            <button
              onClick={onCancel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[--color-danger-bd] py-3 text-sm font-medium text-[--color-danger] transition-colors hover:border-[--color-danger-bd] hover:bg-[--color-danger-bg]"
            >
              <XCircle className="h-4 w-4" />
              Cancelar clase
            </button>
          </div>
        )}
      </div>
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
      <Icon className="h-4 w-4 shrink-0 text-[--tx-disabled]" />
      <span className="w-16 shrink-0 text-[--tx-disabled]">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-[--gold] hover:underline">
          {value}
        </a>
      ) : (
        <span className="text-[--tx-primary]">{value}</span>
      )}
    </div>
  );
}
