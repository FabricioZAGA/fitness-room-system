import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, Plus, Search, Users } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { StudentStatusBadge } from "@/components/shared/StatusBadge";
import { CreateStudentModal } from "@/components/shared/CreateStudentModal";
import { getInitials } from "@/lib/utils";
import type { StudentStatus } from "@/types/student";

export const Route = createFileRoute("/students/")({
  component: StudentsPage,
});

const STATUS_FILTERS: { label: string; value: StudentStatus | undefined; color: string }[] = [
  { label: "Todos", value: undefined, color: "" },
  { label: "Activos", value: "active", color: "emerald" },
  { label: "Nuevos", value: "new", color: "blue" },
  { label: "Fundadores", value: "founder", color: "violet" },
  { label: "Inactivos", value: "inactive", color: "slate" },
];

function StudentsPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StudentStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useStudents({ status: statusFilter });

  const students = data?.items ?? [];
  const filtered = search
    ? students.filter(
        (s) =>
          s.full_name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  return (
    <>
      <div className="min-h-screen bg-[--bg-base] p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--tx-primary]">Miembros</h1>
            <p className="mt-1 text-lg text-[--tx-muted]">
              {data?.total ?? 0} miembro{data?.total !== 1 ? "s" : ""} registrado{data?.total !== 1 ? "s" : ""}
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
            onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"}
          >
            <Plus className="h-5 w-5" />
            Nuevo Miembro
          </button>
        </div>

        {/* Search + Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[--tx-disabled]" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo electrónico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-[--bd-default] bg-[--bg-surface] py-4 pl-14 pr-4 text-base text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  statusFilter === f.value ? "shadow-lg" : "border border-[--bd-subtle] bg-[--bg-muted] text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary]"
                }`}
                style={
                  statusFilter === f.value
                    ? {
                        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                        color: "var(--gold-fg)",
                        boxShadow: "0 10px 25px var(--gold-bg)",
                      }
                    : undefined
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] py-20 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-[--tx-disabled]" />
            <p className="text-xl text-[--tx-muted]">
              {search ? "No se encontraron miembros" : "No hay miembros registrados"}
            </p>
            <p className="mt-2 text-[--tx-disabled]">
              {search ? "Intenta con otro término de búsqueda" : "Registra el primer miembro"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((student) => (
              <Link
                key={student.student_id}
                to="/students/$studentId"
                params={{ studentId: student.student_id }}
                className="flex items-center justify-between rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5 transition-all hover:border-[--gold-bd] hover:bg-[--bg-surface]/80"
              >
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.full_name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                      style={{
                        background: "linear-gradient(135deg, var(--gold-bg) 0%, var(--gold-bg) 100%)",
                        color: "var(--gold)"
                      }}>
                      {getInitials(student.full_name)}
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <p className="text-lg font-semibold text-[--tx-primary]">{student.full_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-[--tx-muted]">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {student.email}
                      </span>
                      {student.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {student.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <StudentStatusBadge status={student.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateStudentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
