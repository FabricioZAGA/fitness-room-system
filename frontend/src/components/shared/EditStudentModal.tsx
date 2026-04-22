/** Modal form for editing an existing student's profile. */

import { useCallback, useEffect, useState } from "react";
import { Camera, User } from "lucide-react";
import { Dialog } from "./Dialog";
import { CameraCapture } from "./CameraCapture";
import { useUpdateStudent, useUploadStudentPhoto } from "@/hooks/useStudents";
import type { Student, StudentStatus, UpdateStudentRequest, EmergencyContact } from "@/types/student";

interface EditStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
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
  type FormState = UpdateStudentRequest & {
    ec_name: string;
    ec_relationship: string;
    ec_phone: string;
  };

  const buildForm = useCallback((s: Student): FormState => ({
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email,
    phone: s.phone ?? "",
    birth_date: s.birth_date ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    ec_name: s.emergency_contact?.name ?? "",
    ec_relationship: s.emergency_contact?.relationship ?? "",
    ec_phone: s.emergency_contact?.phone ?? "",
    status: s.status,
    notes: s.notes ?? "",
  }), []);

  const [form, setForm] = useState<FormState>(buildForm(student));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    setForm(buildForm(student));
    setPhotoPreview(null);
  }, [student, buildForm]);

  const { mutate, isPending } = useUpdateStudent(student.student_id);
  const { mutate: uploadPhoto } = useUploadStudentPhoto(student.student_id);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
    const hasEC = form.ec_name && form.ec_phone;
    const ec: EmergencyContact | undefined = hasEC
      ? {
          name: form.ec_name,
          relationship: form.ec_relationship || "familiar",
          phone: normalizePhone(form.ec_phone),
        }
      : undefined;
    mutate(
      {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: normalizedPhone || undefined,
        birth_date: form.birth_date || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        emergency_contact: ec,
        status: form.status,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          if (photoPreview) {
            uploadPhoto(photoPreview);
          }
          onClose();
        },
      }
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
        {/* Profile Photo */}
        {showCamera ? (
          <CameraCapture
            onCapture={(b64) => { setPhotoPreview(b64); setShowCamera(false); }}
            onClose={() => setShowCamera(false)}
            currentPhoto={student.photo_url}
          />
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[--bd-subtle] bg-[--bg-muted]">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : student.photo_url ? (
                <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[--tx-disabled]">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-3 py-2 text-xs font-medium text-[--tx-muted] transition-all hover:border-[--gold] hover:text-[--gold]"
              >
                <Camera className="h-3.5 w-3.5" />
                {photoPreview || student.photo_url ? "Cambiar foto" : "Tomar foto"}
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="text-xs text-[--tx-disabled] hover:text-[--color-danger] transition-colors"
                >
                  Quitar cambio
                </button>
              )}
            </div>
          </div>
        )}

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
            className={`${inputCls} ${emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`}
          />
          {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input
              name="phone"
              value={form.phone ?? ""}
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
                : <p className="mt-1 text-xs text-[--tx-disabled]">Se agregar\u00e1 +52 autom\u00e1ticamente</p>
            }
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de nacimiento">
            <input
              name="birth_date"
              type="date"
              value={form.birth_date ?? ""}
              onChange={handleChange}
              className={inputCls}
            />
          </Field>
          <Field label="Ciudad">
            <input
              name="city"
              value={form.city ?? ""}
              onChange={handleChange}
              placeholder="CDMX"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Domicilio">
          <input
            name="address"
            value={form.address ?? ""}
            onChange={handleChange}
            placeholder="Calle, número, colonia"
            className={inputCls}
          />
        </Field>

        {/* Emergency contact */}
        <div className="border-t border-[--bd-subtle] pt-3 mt-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">Contacto de emergencia</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                name="ec_name"
                value={form.ec_name}
                onChange={handleChange}
                placeholder="María García"
                className={inputCls}
              />
            </Field>
            <Field label="Parentesco">
              <input
                name="ec_relationship"
                value={form.ec_relationship}
                onChange={handleChange}
                placeholder="Madre"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Teléfono de emergencia">
              <input
                name="ec_phone"
                value={form.ec_phone}
                onChange={handleChange}
                placeholder="55 1234 5678"
                inputMode="tel"
                maxLength={18}
                className={inputCls}
              />
            </Field>
          </div>
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
            className="rounded-xl border border-[--bd-subtle] px-5 py-2.5 text-sm font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 25px var(--gold-bg)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
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
      <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
