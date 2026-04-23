/** Modal form for editing an existing instructor. */

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "./Dialog";
import { PhoneInput } from "./PhoneInput";
import { useUpdateInstructor } from "@/hooks/useInstructors";
import { EMAIL_REGEX } from "@/lib/phone";
import { SPECIALTIES } from "@/lib/specialties";
import type { Instructor, UpdateInstructorRequest } from "@/types/instructor";

interface EditInstructorModalProps {
  open: boolean;
  onClose: () => void;
  instructor: Instructor;
}

const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none";

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
  const [customSpecialty, setCustomSpecialty] = useState("");

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

  function addCustomSpecialty(): void {
    const trimmed = customSpecialty.trim();
    if (!trimmed || form.specialties?.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      specialties: [...(prev.specialties ?? []), trimmed],
    }));
    setCustomSpecialty("");
  }

  const emailError = form.email && !EMAIL_REGEX.test(form.email)
    ? "Email inv\u00e1lido"
    : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (emailError) return;
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
            className={`w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none ${emailError ? "border-red-500 focus:border-red-500" : ""}`}
          />
          {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
        </div>

        <PhoneInput
          label="Teléfono"
          value={form.phone ?? ""}
          onChange={(e164) => setForm((prev) => ({ ...prev, phone: e164 }))}
        />

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
            {form.specialties?.filter((s) => !SPECIALTIES.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className="rounded-lg border border-[--color-success-bd] bg-[--color-success-bg] px-3 py-1.5 text-xs font-medium text-[--color-success] transition-all"
              >
                {s} ×
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customSpecialty}
              onChange={(e) => setCustomSpecialty(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSpecialty(); } }}
              placeholder="Agregar especialidad..."
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={addCustomSpecialty}
              disabled={!customSpecialty.trim()}
              className="shrink-0 rounded-xl border border-[--bd-subtle] px-3 py-2 text-sm text-[--tx-muted] transition-colors hover:border-[--gold] hover:text-[--gold] disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
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
