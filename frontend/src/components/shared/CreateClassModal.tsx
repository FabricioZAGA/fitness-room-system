/** Modal form for creating a new fitness class. */

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useCreateClass } from "@/hooks/useClasses";
import { useInstructors } from "@/hooks/useInstructors";
import type { ClassType, CreateClassRequest } from "@/types/class";
import { CLASS_TYPE_LABELS } from "@/types/class";

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
}

const CLASS_TYPES = Object.entries(CLASS_TYPE_LABELS) as [ClassType, string][];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const INITIAL: CreateClassRequest = {
  class_type: "zumba",
  instructor_name: "",
  class_date: todayStr(),
  start_time: "07:00",
  duration_minutes: 60,
  capacity: 15,
  location: "Sala A",
  description: "",
};

export function CreateClassModal({
  open,
  onClose,
}: CreateClassModalProps): React.JSX.Element {
  const [form, setForm] = useState<CreateClassRequest>(INITIAL);
  const { mutate, isPending } = useCreateClass();
  const { data: instructorsData } = useInstructors({ status: "active" });
  const instructors = instructorsData?.items ?? [];

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
      title="Nueva Clase"
      description="Agrega una clase al calendario"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de clase *">
            <select
              name="class_type"
              value={form.class_type}
              onChange={handleChange}
              className={inputCls}
            >
              {CLASS_TYPES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
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
            className="rounded-xl border-2 border-slate-700 px-5 py-3 text-sm font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Crear Clase"}
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
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-base text-white placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
