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
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Nombre
            </label>
            <input
              name="first_name"
              value={form.first_name ?? ""}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Apellido
            </label>
            <input
              name="last_name"
              value={form.last_name ?? ""}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Correo electrónico
          </label>
          <input
            name="email"
            type="email"
            value={form.email ?? ""}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Teléfono <span className="text-slate-500">(opcional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone ?? ""}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
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
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Biografía <span className="text-slate-500">(opcional)</span>
          </label>
          <textarea
            name="bio"
            value={form.bio ?? ""}
            onChange={handleChange}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
