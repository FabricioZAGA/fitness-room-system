/** Modal form for creating a new instructor. */

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useCreateInstructor } from "@/hooks/useInstructors";
import type { CreateInstructorRequest } from "@/types/instructor";

interface CreateInstructorModalProps {
  open: boolean;
  onClose: () => void;
}

const PHONE_REGEX = /^\+52\d{10}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, "");
  if (/^\d{10}$/.test(digits)) return `+52${digits}`;
  if (/^52\d{10}$/.test(digits)) return `+${digits}`;
  return digits.startsWith("+") ? digits : raw;
}

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)}`;
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

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value.replace(/[^\d+\s\-().]/g, "");
    setForm((prev) => ({ ...prev, phone: raw }));
  }

  const phoneNormalized = form.phone ? normalizePhone(form.phone) : "";
  const phoneError = form.phone && !PHONE_REGEX.test(phoneNormalized)
    ? "Formato: 10 d\u00edgitos (ej. 55 1234 5678)"
    : "";
  const emailError = form.email && !EMAIL_REGEX.test(form.email)
    ? "Email inv\u00e1lido"
    : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (phoneError || emailError) return;
    const normalizedPhone = form.phone ? normalizePhone(form.phone) : undefined;
    mutate(
      {
        ...form,
        phone: normalizedPhone || undefined,
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
            className={`${inputCls} ${emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`}
            placeholder="maria@gym.com"
          />
          {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
        </Field>

        <Field label="Teléfono">
          <input
            name="phone"
            value={form.phone}
            onChange={handlePhoneChange}
            placeholder="55 1234 5678"
            inputMode="tel"
            maxLength={18}
            className={`${inputCls} ${phoneError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`}
          />
          {phoneError
            ? <p className="mt-1 text-xs text-red-400">{phoneError}</p>
            : form.phone
              ? <p className="mt-1 text-xs text-emerald-400">+52 {formatPhoneDisplay(form.phone.replace(/\D/g, "").replace(/^52/, ""))}</p>
              : <p className="mt-1 text-xs text-[--tx-disabled]">Se agregará +52 automáticamente</p>
          }
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
