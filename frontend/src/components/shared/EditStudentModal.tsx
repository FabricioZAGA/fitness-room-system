/** Modal form for editing an existing student's profile. */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, User } from "lucide-react";
import { Dialog } from "./Dialog";
import { CameraCapture } from "./CameraCapture";
import { PhoneInput } from "./PhoneInput";
import { AddressInput } from "./AddressInput";
import { useUpdateStudent, useUploadStudentPhoto } from "@/hooks/useStudents";
import { EMAIL_REGEX } from "@/lib/phone";
import { EMPTY_ADDRESS, formatAddress, parseAddress, type StructuredAddress } from "@/lib/address";
import type { Student, StudentStatus, EmergencyContact } from "@/types/student";

interface EditStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
}

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "suspended", label: "Suspendido" },
];

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  address: StructuredAddress;
  ec_name: string;
  ec_relationship: string;
  ec_phone: string;
  status: StudentStatus;
  notes: string;
};

export function EditStudentModal({
  open,
  onClose,
  student,
}: EditStudentModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const buildForm = useCallback((s: Student): FormState => ({
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email,
    phone: s.phone ?? "",
    birth_date: s.birth_date ?? "",
    address: s.address ? parseAddress(s.address) : { ...EMPTY_ADDRESS, city: s.city ?? "" },
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

  const emailError = form.email && !EMAIL_REGEX.test(form.email)
    ? "Email inv\u00e1lido"
    : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (emailError) return;
    const hasEC = form.ec_name && form.ec_phone;
    const ec: EmergencyContact | undefined = hasEC
      ? {
          name: form.ec_name,
          relationship: form.ec_relationship || "familiar",
          phone: form.ec_phone,
        }
      : undefined;
    const addressStr = formatAddress(form.address);
    mutate(
      {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        birth_date: form.birth_date || undefined,
        address: addressStr || undefined,
        city: form.address.city || undefined,
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
      title={t("students.editStudentTitle")}
      description={t("students.editStudentDesc", { name: student.full_name })}
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
                {photoPreview || student.photo_url ? t("students.changePhoto") : t("students.takePhoto")}
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="text-xs text-[--tx-disabled] hover:text-[--color-danger] transition-colors"
                >
                  {t("students.revertPhoto")}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("students.firstName")}>
            <input
              name="first_name"
              value={form.first_name ?? ""}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label={t("students.lastName")}>
            <input
              name="last_name"
              value={form.last_name ?? ""}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <Field label={`${t("common.email")} *`}>
          <input
            name="email"
            type="email"
            value={form.email ?? ""}
            onChange={handleChange}
            required
            className={`${inputCls} ${emailError ? "border-[--color-danger] focus:border-[--color-danger] focus:ring-[--color-danger]/20" : ""}`}
          />
          {emailError && <p className="mt-1 text-xs text-[--color-danger]">{t("common.invalidEmail")}</p>}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <PhoneInput
            label={t("common.phone")}
            value={form.phone}
            onChange={(e164) => setForm((prev) => ({ ...prev, phone: e164 }))}
          />
          <Field label={t("common.status")}>
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

        <Field label={t("common.birthDate")}>
          <input
            name="birth_date"
            type="date"
            value={form.birth_date ?? ""}
            onChange={handleChange}
            className={inputCls}
          />
        </Field>

        {/* Structured address */}
        <div className="border-t border-[--bd-subtle] pt-3 mt-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">{t("students.domicilio")}</p>
          <AddressInput
            value={form.address}
            onChange={(addr) => setForm((prev) => ({ ...prev, address: addr }))}
          />
        </div>

        {/* Emergency contact */}
        <div className="border-t border-[--bd-subtle] pt-3 mt-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">{t("students.emergencyContactSection")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("common.name")}>
              <input
                name="ec_name"
                value={form.ec_name}
                onChange={handleChange}
                placeholder="María García"
                className={inputCls}
              />
            </Field>
            <Field label={t("students.ecRelationship")}>
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
            <PhoneInput
              label={t("students.ecPhone")}
              value={form.ec_phone}
              onChange={(e164) => setForm((prev) => ({ ...prev, ec_phone: e164 }))}
            />
          </div>
        </div>

        <Field label={t("common.notes")}>
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
            {t("common.cancel")}
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
            {isPending ? t("common.saving") : t("students.saveChanges")}
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
