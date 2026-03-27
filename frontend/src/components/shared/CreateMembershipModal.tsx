/** Modal form for assigning a membership to a student. */

import { useState } from "react";
import { Dialog } from "./Dialog";
import { useAssignMembership } from "@/hooks/useMemberships";
import { useStudents } from "@/hooks/useStudents";
import type { CreateMembershipRequest, MembershipType } from "@/types/membership";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";

interface CreateMembershipModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a student — pass when opening from a student's detail page. */
  studentId?: string;
}

const MEMBERSHIP_TYPES = Object.entries(MEMBERSHIP_TYPE_LABELS) as [
  MembershipType,
  string,
][];

const CLASS_PACKS = new Set<MembershipType>([
  "class_pack_5",
  "class_pack_10",
  "class_pack_20",
]);

const CLASS_PACK_TOTALS: Partial<Record<MembershipType, number>> = {
  class_pack_5: 5,
  class_pack_10: 10,
  class_pack_20: 20,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const END_DATE_DEFAULTS: Partial<Record<MembershipType, string>> = {
  monthly: addMonths(todayStr(), 1),
  quarterly: addMonths(todayStr(), 3),
  semi_annual: addMonths(todayStr(), 6),
  annual: addMonths(todayStr(), 12),
  day_pass: todayStr(),
};

const INITIAL_FORM = {
  student_id: "",
  membership_type: "monthly" as MembershipType,
  start_date: todayStr(),
  end_date: END_DATE_DEFAULTS["monthly"] ?? "",
  price_paid: 0,
  classes_total: undefined as number | undefined,
  notes: "",
};

export function CreateMembershipModal({
  open,
  onClose,
  studentId,
}: CreateMembershipModalProps): React.JSX.Element {
  const [form, setForm] = useState({ ...INITIAL_FORM, student_id: studentId ?? "" });
  const { mutate, isPending } = useAssignMembership();
  const { data: studentsData } = useStudents({ limit: 200 });
  const students = studentsData?.items ?? [];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "membership_type") {
        const type = value as MembershipType;
        next.end_date = END_DATE_DEFAULTS[type] ?? addMonths(prev.start_date, 1);
        next.classes_total = CLASS_PACK_TOTALS[type];
      }

      if (name === "start_date") {
        const type = prev.membership_type;
        next.end_date = END_DATE_DEFAULTS[type] ?? addMonths(value, 1);
      }

      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const payload: CreateMembershipRequest = {
      student_id: form.student_id,
      membership_type: form.membership_type,
      start_date: form.start_date,
      end_date: form.end_date,
      price_paid: Number(form.price_paid),
      classes_total: form.classes_total,
      notes: form.notes || undefined,
    };
    mutate(payload, {
      onSuccess: () => {
        setForm({ ...INITIAL_FORM, student_id: studentId ?? "" });
        onClose();
      },
    });
  }

  const isClassPack = CLASS_PACKS.has(form.membership_type);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nueva Membresía"
      description="Asigna una membresía a un alumno"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student selector — hidden when studentId is pre-selected */}
        {!studentId && (
          <Field label="Alumno *">
            <select
              name="student_id"
              value={form.student_id}
              onChange={handleChange}
              required
              className={inputCls}
            >
              <option value="">— Selecciona un alumno —</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.full_name} — {s.email}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Tipo de membresía *">
          <select
            name="membership_type"
            value={form.membership_type}
            onChange={handleChange}
            className={inputCls}
          >
            {MEMBERSHIP_TYPES.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha inicio *">
            <input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Fecha fin *">
            <input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio pagado (MXN) *">
            <input
              name="price_paid"
              type="number"
              min={0}
              step={0.01}
              value={form.price_paid}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          {isClassPack && (
            <Field label="Total de clases">
              <input
                name="classes_total"
                type="number"
                min={1}
                value={form.classes_total ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    classes_total: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className={inputCls}
              />
            </Field>
          )}
        </div>

        <Field label="Notas">
          <textarea
            name="notes"
            value={form.notes}
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
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Asignar Membresía"}
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
      <label className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
