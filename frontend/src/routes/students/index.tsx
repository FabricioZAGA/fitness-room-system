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
      <div className="min-h-screen bg-slate-950 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Miembros</h1>
            <p className="mt-1 text-lg text-slate-400">
              {data?.total ?? 0} miembro{data?.total !== 1 ? "s" : ""} registrado{data?.total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5" />
            Nuevo Miembro
          </button>
        </div>

        {/* Search + Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo electrónico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-800 bg-slate-900 py-4 pl-14 pr-4 text-base text-white placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  statusFilter === f.value
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 py-20 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-slate-700" />
            <p className="text-xl text-slate-400">
              {search ? "No se encontraron miembros" : "No hay miembros registrados"}
            </p>
            <p className="mt-2 text-slate-500">
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
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-emerald-500/30 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-lg font-bold text-emerald-400">
                    {getInitials(student.full_name)}
                  </div>

                  {/* Info */}
                  <div>
                    <p className="text-lg font-semibold text-white">{student.full_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-400">
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
