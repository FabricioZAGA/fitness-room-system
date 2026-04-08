/** Modal form for editing an existing instructor. */

import { useState, useEffect } from "react";
import { Dialog } from "./Dialog";
import { useUpdateInstructor } from "@/hooks/useInstructors";
import type { Instructor, UpdateInstructorRequest } from "@/types/instructor";

interface EditInstructorModalProps {
  open: boolean;
  onClose: () => void;
  instructor: Instructor;
}

const SPECIALTIES = [
  "Zumba", "Yoga", "Spinning", "CrossFit", "Funcional",
  "Boxing", "Pilates", "HIIT", "Aerobics", "Danza",
];

export function EditInstructorModal({
  open,
  onClose,
  instructor,
}: EditInstructorModalProps): React.JSX.Element {
  const [form, setForm] = useState<UpdateInstructorRequest>({
    first_name: instructor.first_name,
    last_name: instructor.last_name,
    email: instructor.email,
    phone: instructor.phone ?? "",
    specialties: instructor.specialties,
    bio: instructor.bio ?? "",
  });

  useEffect(() => {
    setForm({
      first_name: instructor.first_name,
      last_name: instructor.last_name,
      email: instructor.email,
      phone: instructor.phone ?? "",
      specialties: instructor.specialties,
      bio: instructor.bio ?? "",
    });
  }, [instructor]);

  const { mutate, isPending } = useUpdateInstructor(instructor.instructor_id);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleSpecialty(specialty: string): void {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties?.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...(prev.specialties ?? []), specialty],
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    mutate(
      {
        ...form,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Editar instructor">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
              Nombre
            </label>
            <input
              name="first_name"
              value={form.first_name ?? ""}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
              Apellido
            </label>
            <input
              name="last_name"
              value={form.last_name ?? ""}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
            Correo electrónico
          </label>
          <input
            name="email"
            type="email"
            value={form.email ?? ""}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
            Teléfono <span className="text-[--tx-disabled]">(opcional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone ?? ""}
            onChange={handleChange}
            className="w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[--tx-primary]">
            Especialidades
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => {
              const selected = form.specialties?.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    selected
                      ? "border-[--color-success-bd] bg-[--color-success-bg] text-[--color-success]"
                      : "border-[--bd-subtle] bg-[--bg-muted] text-[--tx-muted] hover:border-[--bd-default]"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
            Biografía <span className="text-[--tx-disabled]">(opcional)</span>
          </label>
          <textarea
            name="bio"
            value={form.bio ?? ""}
            onChange={handleChange}
            rows={3}
            className="w-full resize-none rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[--bd-subtle] px-5 py-2.5 text-sm font-medium text-[--tx-muted] hover:text-[--tx-primary] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
