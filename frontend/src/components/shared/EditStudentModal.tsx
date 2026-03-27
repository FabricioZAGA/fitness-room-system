/** Modal form for editing an existing student's profile. */

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { useUpdateStudent } from "@/hooks/useStudents";
import type { Student, StudentStatus, UpdateStudentRequest } from "@/types/student";

interface EditStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
}

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "active", label: "Activo" },
  { value: "founder", label: "Fundador" },
  { value: "inactive", label: "Inactivo" },
];

export function EditStudentModal({
  open,
  onClose,
  student,
}: EditStudentModalProps): React.JSX.Element {
  const [form, setForm] = useState<UpdateStudentRequest>({
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email,
    phone: student.phone ?? "",
    status: student.status,
    notes: student.notes ?? "",
  });

  useEffect(() => {
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone: student.phone ?? "",
      status: student.status,
      notes: student.notes ?? "",
    });
  }, [student]);

  const { mutate, isPending } = useUpdateStudent(student.student_id);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    mutate(
      {
        ...form,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editar Alumno"
      description={`Actualiza el perfil de ${student.full_name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre *">
            <input
              name="first_name"
              value={form.first_name ?? ""}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Apellido *">
            <input
              name="last_name"
              value={form.last_name ?? ""}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Correo electrónico *">
          <input
            name="email"
            type="email"
            value={form.email ?? ""}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input
              name="phone"
              value={form.phone ?? ""}
              onChange={handleChange}
              placeholder="+52 555 0000"
              className={inputCls}
            />
          </Field>
          <Field label="Estado">
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputCls}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notas">
          <textarea
            name="notes"
            value={form.notes ?? ""}
            onChange={handleChange}
            rows={2}
            placeholder="Información adicional..."
            className={`${inputCls} resize-none`}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
