/**
 * Instructors list page with clean, accessible design.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Mail, Phone, Award } from "lucide-react";
import { useInstructors } from "@/hooks/useInstructors";
import { INSTRUCTOR_STATUS_COLORS, INSTRUCTOR_STATUS_LABELS } from "@/types/instructor";
import { CreateInstructorModal } from "@/components/shared/CreateInstructorModal";

export const Route = createFileRoute("/instructors/")({
  component: InstructorsPage,
});

function InstructorsPage(): React.JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useInstructors({ limit: 50 });
  const instructors = data?.items ?? [];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Instructores</h1>
          <p className="mt-1 text-lg text-slate-400">
            Gestiona el equipo de instructores del gimnasio
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
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
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-slate-800"
            />
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Award className="h-8 w-8 text-slate-600" />
          </div>
          <p className="text-xl text-slate-400">No hay instructores registrados</p>
          <p className="mt-2 text-slate-500">
            Agrega instructores para asignarlos a las clases
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <div
              key={instructor.instructor_id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-slate-700"
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">
                  {instructor.first_name.charAt(0)}
                  {instructor.last_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">
                    {instructor.first_name} {instructor.last_name}
                  </h3>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${INSTRUCTOR_STATUS_COLORS[instructor.status]}`}
                  >
                    {INSTRUCTOR_STATUS_LABELS[instructor.status]}
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="h-4 w-4" />
                  {instructor.email}
                </div>
                {instructor.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="h-4 w-4" />
                    {instructor.phone}
                  </div>
                )}
              </div>

              {/* Specialties */}
              {instructor.specialties.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Especialidades
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {instructor.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                <div className="rounded-lg bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {instructor.classes_this_week}
                  </p>
                  <p className="text-xs text-slate-500">Esta semana</p>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-300">
                    {instructor.total_classes_taught}
                  </p>
                  <p className="text-xs text-slate-500">Total clases</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateInstructorModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
