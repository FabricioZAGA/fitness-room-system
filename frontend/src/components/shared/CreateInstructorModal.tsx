/** Modal form for creating a new instructor. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Dialog } from "./Dialog";
import { PhoneInput } from "./PhoneInput";
import { useCreateInstructor } from "@/hooks/useInstructors";
import { EMAIL_REGEX } from "@/lib/phone";
import { SPECIALTIES } from "@/lib/specialties";
import type { CreateInstructorRequest } from "@/types/instructor";

interface CreateInstructorModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateInstructorModal({
  open,
  onClose,
}: CreateInstructorModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateInstructorRequest>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialties: [],
    bio: "",
  });
  const [customSpecialty, setCustomSpecialty] = useState("");

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
          setCustomSpecialty("");
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("instructors.newInstructorTitle")}
      description={t("instructors.newInstructorDesc")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("students.firstName")}>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              className={inputCls}
              placeholder="María"
            />
          </Field>
          <Field label={t("students.lastName")}>
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

        <Field label={`${t("common.email")} *`}>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className={`${inputCls} ${emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`}
            placeholder="maria@gym.com"
          />
          {emailError && <p className="mt-1 text-xs text-red-400">{t("common.invalidEmail")}</p>}
        </Field>

        <PhoneInput
          label={t("common.phone")}
          value={form.phone ?? ""}
          onChange={(e164) => setForm((prev) => ({ ...prev, phone: e164 }))}
        />

        <Field label={t("instructors.specialties")}>
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
            {/* Custom specialties not in default list */}
            {form.specialties?.filter((s) => !SPECIALTIES.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className="rounded-lg px-3 py-2 text-sm font-medium shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)"
                }}
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
              placeholder={t("instructors.addSpecialty")}
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
        </Field>

        <Field label={t("instructors.bio")}>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder={t("instructors.bioPlaceholder")}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-[--bd-subtle] px-5 py-3 text-sm font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
          >
            {t("common.cancel")}
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
            {isPending ? t("common.saving") : t("instructors.createInstructor")}
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
