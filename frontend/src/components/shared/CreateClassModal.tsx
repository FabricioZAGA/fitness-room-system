/** Modal form for creating a new fitness class — or editing one when `editClass` is given. */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";
import { useCreateClass, useUpdateClass } from "@/hooks/useClasses";
import { useInstructors } from "@/hooks/useInstructors";
import { useClassTypes } from "@/hooks/useCatalogs";
import type { ClassMode, CreateClassRequest, FitnessClass, UpdateClassRequest } from "@/types/class";
import { CLASS_MODE_LABELS } from "@/types/class";

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this class instead of creating a new one. */
  editClass?: FitnessClass | null;
  /** Called with the updated class after a successful edit. */
  onUpdated?: (updated: FitnessClass) => void;
}

const CLASS_MODES = Object.entries(CLASS_MODE_LABELS) as [ClassMode, string][];

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

const INITIAL: CreateClassRequest = {
  class_type: "",
  instructor_name: "",
  class_date: todayStr(),
  start_time: "07:00",
  duration_minutes: 60,
  capacity: 15,
  location: "Sala A",
  description: "",
  class_mode: "presencial",
};

function formFromClass(cls: FitnessClass): CreateClassRequest {
  return {
    class_type: cls.class_type,
    instructor_name: cls.instructor_name,
    class_date: cls.class_date,
    start_time: cls.start_time.slice(0, 5),
    duration_minutes: cls.duration_minutes,
    capacity: cls.capacity,
    location: cls.location ?? "",
    description: cls.description ?? "",
    class_mode: cls.class_mode,
    class_link: cls.class_link ?? "",
  };
}

/** Only the fields that actually changed, so PATCH stays minimal. */
function diffForUpdate(cls: FitnessClass, form: CreateClassRequest): UpdateClassRequest {
  const original = formFromClass(cls);
  const changes: UpdateClassRequest = {};
  (Object.keys(form) as (keyof CreateClassRequest)[]).forEach((key) => {
    if (form[key] !== original[key]) {
      (changes as Record<string, unknown>)[key] = form[key];
    }
  });
  return changes;
}

export function CreateClassModal({
  open,
  onClose,
  editClass = null,
  onUpdated,
}: CreateClassModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const isEdit = editClass !== null;
  const [form, setForm] = useState<CreateClassRequest>(INITIAL);
  const { mutate, isPending: creating } = useCreateClass();
  const { mutate: update, isPending: updating } = useUpdateClass(editClass?.class_id ?? "");
  const isPending = creating || updating;
  const { data: instructorsData } = useInstructors({ status: "active" });
  const instructors = instructorsData?.items ?? [];
  const { data: classTypes = [] } = useClassTypes();

  useEffect(() => {
    if (open) setForm(editClass ? formFromClass(editClass) : INITIAL);
  }, [open, editClass]);

  // Keep the current values selectable even if the instructor was deactivated
  // or the class type was removed from the catalog.
  const instructorNames = instructors.map((i) => `${i.first_name} ${i.last_name}`);
  const missingInstructor =
    form.instructor_name && !instructorNames.includes(form.instructor_name)
      ? form.instructor_name
      : null;
  const missingClassType =
    form.class_type && !classTypes.some((ct) => ct.slug === form.class_type)
      ? form.class_type
      : null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    const { name, value, type } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? undefined : Number(value)) : value,
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (editClass) {
      const changes = diffForUpdate(editClass, form);
      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      update(changes, {
        onSuccess: (updated) => {
          onUpdated?.(updated);
          onClose();
        },
      });
      return;
    }
    mutate(
      {
        ...form,
        description: form.description || undefined,
        class_link: form.class_link || undefined,
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
      title={isEdit ? t("classes.editClass") : "Nueva Clase"}
      description={isEdit ? t("classes.editClassDesc") : "Agrega una clase al calendario"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEdit && editClass.reservations_count + editClass.waitlist_count > 0 && (
          <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-4 py-3 text-sm text-[--tx-muted]">
            {t("classes.editKeepsEnrolled", {
              count: editClass.reservations_count + editClass.waitlist_count,
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de clase *">
            <select
              name="class_type"
              value={form.class_type}
              onChange={handleChange}
              required
              className={inputCls}
            >
              <option value="">— Selecciona tipo —</option>
              {missingClassType && <option value={missingClassType}>{missingClassType}</option>}
              {classTypes.map((ct) => (
                <option key={ct.slug} value={ct.slug}>
                  {ct.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instructor *">
            <select
              name="instructor_name"
              value={form.instructor_name}
              onChange={handleChange}
              required
              className={inputCls}
            >
              <option value="">— Selecciona instructor —</option>
              {missingInstructor && <option value={missingInstructor}>{missingInstructor}</option>}
              {instructors.map((inst) => (
                <option key={inst.instructor_id} value={`${inst.first_name} ${inst.last_name}`}>
                  {inst.first_name} {inst.last_name}
                  {inst.specialties.length > 0 ? ` · ${inst.specialties[0]}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Fecha *">
            <input
              name="class_date"
              type="date"
              value={form.class_date}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Hora inicio *">
            <input
              name="start_time"
              type="time"
              value={form.start_time}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Duración (min)">
            <input
              name="duration_minutes"
              type="number"
              min={15}
              max={180}
              value={form.duration_minutes ?? ""}
              onChange={handleChange}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacidad máxima">
            <input
              name="capacity"
              type="number"
              min={1}
              max={100}
              value={form.capacity ?? ""}
              onChange={handleChange}
              className={inputCls}
            />
          </Field>
          <Field label="Ubicación">
            <input
              name="location"
              value={form.location ?? ""}
              onChange={handleChange}
              placeholder="Sala A"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Modalidad">
            <select
              name="class_mode"
              value={form.class_mode ?? "presencial"}
              onChange={handleChange}
              className={inputCls}
            >
              {CLASS_MODES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link de la clase (opcional)">
            <input
              name="class_link"
              type="url"
              value={form.class_link ?? ""}
              onChange={handleChange}
              placeholder="https://zoom.us/j/..."
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            name="description"
            value={form.description ?? ""}
            onChange={handleChange}
            rows={2}
            placeholder="Descripción de la clase..."
            className={`${inputCls} resize-none`}
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
            {isPending ? "Guardando..." : isEdit ? t("classes.saveChanges") : "Crear Clase"}
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
      <label className="mb-2 block text-sm font-medium text-[--tx-primary]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-base text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
