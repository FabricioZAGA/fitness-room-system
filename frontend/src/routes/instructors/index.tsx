/** Instructors list page. */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Instructor | null>(null);
  const { data, isLoading } = useInstructors({ limit: 50 });
  const instructors = data?.items ?? [];

  const { mutate: activate } = useActivateInstructor();
  const { mutate: deactivate } = useDeactivateInstructor();
  const { mutate: deleteInstructor } = useDeleteInstructor();

  const activeCount = instructors.filter((i) => i.status === "active").length;

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">{t("instructors.title")}</h1>
          <p className="mt-1 text-lg text-[--tx-muted]">
            {activeCount} activos · {instructors.length} total
          </p>
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
          {t("instructors.newInstructor")}
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-[--bg-muted]" />
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[--bg-muted]">
            <Award className="h-8 w-8 text-[--tx-disabled]" />
          </div>
          <p className="text-xl text-[--tx-muted]">{t("instructors.noInstructors")}</p>
          <p className="mt-2 text-[--tx-disabled]">{t("instructors.noInstructorsDesc")}</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)"
            }}
          >
            <Plus className="h-4 w-4" />
            {t("instructors.addFirst")}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <div
              key={instructor.instructor_id}
              className={`rounded-2xl border bg-[--bg-surface] p-6 transition-all hover:border-[--bd-subtle] ${
                instructor.status === "active" ? "border-[--bd-default]" : "border-[--bd-default]/50 opacity-75"
              }`}
            >
              {/* Header row */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                    style={{
                      background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                      color: "var(--gold-fg)"
                    }}>
                    {instructor.first_name.charAt(0)}{instructor.last_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[--tx-primary]">
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
                    className="rounded-lg p-2 text-[--tx-disabled] transition-colors hover:bg-[--bg-muted] hover:text-[--tx-primary]"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {instructor.status === "active" || instructor.status === "on_leave" ? (
                    <button
                      onClick={() => deactivate(instructor.instructor_id)}
                      className="rounded-lg p-2 text-[--tx-disabled] transition-colors hover:bg-[--color-warning-bg] hover:text-[--color-warning]"
                      title={t("instructors.deactivate")}
                    >
                      <PowerOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => activate(instructor.instructor_id)}
                      className="rounded-lg p-2 text-[--tx-disabled] transition-colors hover:bg-[--color-success-bg] hover:text-[--color-success]"
                      title={t("instructors.activate")}
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
                    className="rounded-lg p-2 text-[--tx-disabled] transition-colors hover:bg-[--color-danger-bg] hover:text-[--color-danger]"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contact */}
              <div className="mb-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-[--tx-muted]">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{instructor.email}</span>
                </div>
                {instructor.phone && (
                  <div className="flex items-center gap-2 text-sm text-[--tx-muted]">
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
                      <span key={s} className="rounded-lg bg-[--bg-muted] px-2.5 py-1 text-xs font-medium text-[--tx-primary]">
                        {s}
                      </span>
                    ))}
                    {instructor.specialties.length > 4 && (
                      <span className="rounded-lg bg-[--bg-muted] px-2.5 py-1 text-xs text-[--tx-disabled]">
                        +{instructor.specialties.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bio */}
              {instructor.bio && (
                <p className="mb-4 line-clamp-2 text-xs text-[--tx-disabled]">{instructor.bio}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 border-t border-[--bd-default] pt-4">
                <div className="rounded-xl bg-[--bg-muted]/50 p-3 text-center">
                  <p className="text-2xl font-bold text-[--color-success]">{instructor.classes_this_week}</p>
                  <p className="text-xs text-[--tx-disabled]">{t("instructors.thisWeek")}</p>
                </div>
                <div className="rounded-xl bg-[--bg-muted]/50 p-3 text-center">
                  <p className="text-2xl font-bold text-[--tx-primary]">{instructor.total_classes_taught}</p>
                  <p className="text-xs text-[--tx-disabled]">{t("instructors.totalClasses")}</p>
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
