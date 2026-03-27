import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { StudentStatusBadge } from "@/components/shared/StatusBadge";
import { CreateStudentModal } from "@/components/shared/CreateStudentModal";
import { getInitials } from "@/lib/utils";
import type { StudentStatus } from "@/types/student";

export const Route = createFileRoute("/students/")({
  component: StudentsPage,
});

const STATUS_FILTERS: { label: string; value: StudentStatus | undefined }[] = [
  { label: "Todos", value: undefined },
  { label: "Activos", value: "active" },
  { label: "Nuevos", value: "new" },
  { label: "Fundadores", value: "founder" },
  { label: "Inactivos", value: "inactive" },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Alumnos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {data?.total ?? 0} alumno{data?.total !== 1 ? "s" : ""} registrado{data?.total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Nuevo Alumno
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-400">No se encontraron alumnos</p>
          <p className="mt-1 text-xs text-zinc-600">
            {search ? "Intenta con otro término de búsqueda" : "Registra el primer alumno"}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Alumno</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((student) => (
                <tr key={student.student_id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: student.student_id }}
                      className="flex items-center gap-3 hover:text-violet-400"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-400">
                        {getInitials(student.full_name)}
                      </div>
                      <span className="font-medium text-zinc-100">{student.full_name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{student.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{student.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StudentStatusBadge status={student.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
      <CreateStudentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
