/** Instructors list page. */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Mail, Phone, Award, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import {
  useInstructors, useActivateInstructor, useDeactivateInstructor, useDeleteInstructor,
} from "@/hooks/useInstructors";
import { INSTRUCTOR_STATUS_COLORS, INSTRUCTOR_STATUS_LABELS } from "@/types/instructor";
import type { Instructor } from "@/types/instructor";
import { CreateInstructorModal } from "@/components/shared/CreateInstructorModal";
import { EditInstructorModal } from "@/components/shared/EditInstructorModal";

export const Route = createFileRoute("/instructors/")({
  component: InstructorsPage,
});

function InstructorsPage(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Instructor | null>(null);
  const { data, isLoading } = useInstructors({ limit: 50 });
  const instructors = data?.items ?? [];

  const { mutate: activate } = useActivateInstructor();
  const { mutate: deactivate } = useDeactivateInstructor();
  const { mutate: deleteInstructor } = useDeleteInstructor();

  const activeCount = instructors.filter((i) => i.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Instructores</h1>
          <p className="mt-1 text-lg text-slate-400">
            {activeCount} activos · {instructors.length} total
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
        >
          <Plus className="h-5 w-5" />
          Nuevo Instructor
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-800" />
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Award className="h-8 w-8 text-slate-600" />
          </div>
          <p className="text-xl text-slate-400">No hay instructores registrados</p>
          <p className="mt-2 text-slate-500">Agrega instructores para asignarlos a las clases</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Agregar primer instructor
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <div
              key={instructor.instructor_id}
              className={`rounded-2xl border bg-slate-900 p-6 transition-all hover:border-slate-700 ${
                instructor.status === "active" ? "border-slate-800" : "border-slate-800/50 opacity-75"
              }`}
            >
              {/* Header row */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
                    {instructor.first_name.charAt(0)}{instructor.last_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      {instructor.first_name} {instructor.last_name}
                    </h3>
                    <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${INSTRUCTOR_STATUS_COLORS[instructor.status]}`}>
                      {INSTRUCTOR_STATUS_LABELS[instructor.status]}
                    </span>
                  </div>
                </div>

                {/* Action menu */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditTarget(instructor)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {instructor.status === "active" || instructor.status === "on_leave" ? (
                    <button
                      onClick={() => deactivate(instructor.instructor_id)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                      title="Desactivar"
                    >
                      <PowerOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => activate(instructor.instructor_id)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                      title="Activar"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${instructor.first_name} ${instructor.last_name}?`)) {
                        deleteInstructor(instructor.instructor_id);
                      }
                    }}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contact */}
              <div className="mb-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{instructor.email}</span>
                </div>
                {instructor.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {instructor.phone}
                  </div>
                )}
              </div>

              {/* Specialties */}
              {instructor.specialties.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {instructor.specialties.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {s}
                      </span>
                    ))}
                    {instructor.specialties.length > 4 && (
                      <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-500">
                        +{instructor.specialties.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bio */}
              {instructor.bio && (
                <p className="mb-4 line-clamp-2 text-xs text-slate-500">{instructor.bio}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                <div className="rounded-xl bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{instructor.classes_this_week}</p>
                  <p className="text-xs text-slate-500">Esta semana</p>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-300">{instructor.total_classes_taught}</p>
                  <p className="text-xs text-slate-500">Total clases</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateInstructorModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editTarget && (
        <EditInstructorModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          instructor={editTarget}
        />
      )}
    </div>
  );
}
