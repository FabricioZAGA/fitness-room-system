/** Modal form for creating a new student. */

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useCreateStudent } from "@/hooks/useStudents";
import type { CreateStudentRequest, StudentStatus } from "@/types/student";

interface CreateStudentModalProps {
  open: boolean;
  onClose: () => void;
}

const INITIAL: CreateStudentRequest = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  status: "new",
  notes: "",
};

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "active", label: "Activo" },
  { value: "founder", label: "Fundador" },
  { value: "inactive", label: "Inactivo" },
];

export function CreateStudentModal({
  open,
  onClose,
}: CreateStudentModalProps): React.JSX.Element {
  const [form, setForm] = useState<CreateStudentRequest>(INITIAL);
  const { mutate, isPending } = useCreateStudent();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
    e.preventDefault();
    mutate(
      {
        ...form,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setForm(INITIAL);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo Alumno"
      description="Registra un nuevo alumno en el sistema"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre *">
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              placeholder="Ana"
              className={inputCls}
            />
          </Field>
          <Field label="Apellido *">
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              placeholder="García"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Correo electrónico *">
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="ana@ejemplo.com"
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
            className={cn(inputCls, "resize-none")}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[--bd-default] px-5 py-2.5 text-sm font-medium text-[--tx-muted] transition-colors hover:border-[--bd-subtle] hover:text-[--tx-primary]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              backgroundColor: "var(--gold)",
              color: "var(--gold-fg)",
            }}
          >
            {isPending ? "Guardando..." : "Registrar Alumno"}
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
      <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
        {label}
      </label>
      {children}
    </div>
  );
}

function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
