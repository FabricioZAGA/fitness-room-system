/** Modal form for creating a new instructor. */

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useCreateInstructor } from "@/hooks/useInstructors";
import type { CreateInstructorRequest } from "@/types/instructor";

interface CreateInstructorModalProps {
  open: boolean;
  onClose: () => void;
}

const SPECIALTIES = [
  "Zumba",
  "Yoga",
  "Spinning",
  "CrossFit",
  "Funcional",
  "Boxing",
  "Pilates",
  "HIIT",
  "Aerobics",
  "Danza",
];

export function CreateInstructorModal({
  open,
  onClose,
}: CreateInstructorModalProps): React.JSX.Element {
  const [form, setForm] = useState<CreateInstructorRequest>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialties: [],
    bio: "",
  });

  const { mutate, isPending } = useCreateInstructor();

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
      {
        onSuccess: () => {
          setForm({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            specialties: [],
            bio: "",
          });
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo Instructor"
      description="Registra un nuevo instructor en el sistema"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre *">
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              className={inputCls}
              placeholder="María"
            />
          </Field>
          <Field label="Apellido *">
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              className={inputCls}
              placeholder="García"
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
            className={inputCls}
            placeholder="maria@gym.com"
          />
        </Field>

        <Field label="Teléfono">
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={inputCls}
            placeholder="+52 55 1234 5678"
          />
        </Field>

        <Field label="Especialidades">
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((specialty) => (
              <button
                key={specialty}
                type="button"
                onClick={() => toggleSpecialty(specialty)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  form.specialties?.includes(specialty)
                    ? "shadow-lg"
                    : "bg-[--bg-muted] text-[--tx-muted] hover:bg-[--bg-surface]"
                }`}
                style={
                  form.specialties?.includes(specialty)
                    ? {
                        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                        color: "var(--gold-fg)"
                      }
                    : undefined
                }
              >
                {specialty}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Biografía">
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Experiencia, certificaciones, etc."
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-[--bd-subtle] px-5 py-3 text-sm font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 25px var(--gold-bg)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
          >
            {isPending ? "Guardando..." : "Crear Instructor"}
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
      <label className="mb-2 block text-sm font-medium text-[--tx-primary]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-base text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
