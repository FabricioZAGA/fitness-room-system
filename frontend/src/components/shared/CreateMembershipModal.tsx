/** Modal form for assigning a membership to a student. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { Dialog } from "./Dialog";
import { useAssignMembership, useMembershipsForStudent } from "@/hooks/useMemberships";
import { useStudents } from "@/hooks/useStudents";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import type { CreateMembershipRequest, MembershipType } from "@/types/membership";
import { MEMBERSHIP_TYPE_LABELS, MEMBERSHIP_DEFAULT_PRICE } from "@/types/membership";
import { formatDate } from "@/lib/utils";
import {
  EMPTY_CHARGE_PAYMENT,
  chargeError,
  chargePayload,
  type ChargePaymentValue,
} from "@/lib/charge";
import { ChargePaymentSection } from "./ChargePaymentSection";

interface CreateMembershipModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a student — pass when opening from a student's detail page. */
  studentId?: string;
}

const STATIC_MEMBERSHIP_TYPES = Object.entries(MEMBERSHIP_TYPE_LABELS) as [
  MembershipType,
  string,
][];

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_TYPE: MembershipType = "room_daily";

const INITIAL_FORM = {
  student_id: "",
  membership_type: DEFAULT_TYPE as MembershipType,
  start_date: todayStr(),
  end_date: addDays(todayStr(), 30),
  price_paid: MEMBERSHIP_DEFAULT_PRICE[DEFAULT_TYPE as keyof typeof MEMBERSHIP_DEFAULT_PRICE],
  classes_total: undefined as number | undefined,
  notes: "",
  duo_partner_id: "",
};

export function CreateMembershipModal({
  open,
  onClose,
  studentId,
}: CreateMembershipModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...INITIAL_FORM, student_id: studentId ?? "" });
  const [payment, setPayment] = useState<ChargePaymentValue>({
    ...EMPTY_CHARGE_PAYMENT,
    studentId: studentId ?? "",
  });
  const patchPayment = useCallback(
    (patch: Partial<ChargePaymentValue>) => setPayment((v) => ({ ...v, ...patch })),
    [],
  );
  const { mutate, isPending } = useAssignMembership();
  const { data: studentsData } = useStudents({ limit: 200 });
  const students = studentsData?.items ?? [];
  const { data: plans } = useMembershipPlans();

  // Build type options from dynamic plans, falling back to static
  const typeOptions: [MembershipType, string][] = plans && plans.length > 0
    ? plans.map((p) => [p.slug as MembershipType, p.label])
    : STATIC_MEMBERSHIP_TYPES;

  // Lookup helpers from plans
  const planMap = new Map((plans ?? []).map((p) => [p.slug, p]));

  function priceForType(type: MembershipType): number {
    return planMap.get(type)?.default_price ?? MEMBERSHIP_DEFAULT_PRICE[type as keyof typeof MEMBERSHIP_DEFAULT_PRICE] ?? 0;
  }

  function planDuration(type: MembershipType): number {
    return planMap.get(type)?.duration_days ?? 30;
  }

  function endDateForType(type: MembershipType, startDate: string): string {
    return addDays(startDate, planDuration(type));
  }

  function isSessionPack(type: MembershipType): boolean {
    const plan = planMap.get(type);
    return plan ? (plan.total_sessions ?? 0) > 0 : type === "room_flex";
  }

  function defaultTotalSessions(type: MembershipType): number | undefined {
    const plan = planMap.get(type);
    return plan?.total_sessions ?? (type === "room_flex" ? 12 : undefined);
  }

  function isDuoType(type: MembershipType): boolean {
    const plan = planMap.get(type);
    return plan ? plan.requires_partner : type === "room_duo";
  }

  const activeStudentId = form.student_id || studentId || "";
  const pricePaid = Number(form.price_paid) || 0;
  const paymentReady = pricePaid <= 0 || chargeError(payment, pricePaid) === null;

  // The buyer of a membership is always the selected student.
  useEffect(() => {
    setPayment((v) =>
      v.studentId === activeStudentId ? v : { ...v, studentId: activeStudentId, balanceAmount: 0 },
    );
  }, [activeStudentId]);

  // Renewing while a membership is still running → the new one is queued and
  // starts the day the last one (active / frozen / already queued) ends.
  const { data: studentMemberships } = useMembershipsForStudent(activeStudentId, 100);
  const queueTail = useMemo(() => {
    const today = todayStr();
    const ends = (studentMemberships?.items ?? [])
      .filter(
        (m) =>
          m.status === "frozen" ||
          m.status === "pending" ||
          (m.status === "active" && m.end_date > today),
      )
      .map((m) => m.end_date)
      .sort();
    return ends.length ? ends[ends.length - 1] : null;
  }, [studentMemberships]);
  // The backend moves an overlapping start to the end of the queue.
  const effectiveStart =
    queueTail !== null && form.start_date < queueTail ? queueTail : form.start_date;
  const isScheduled = effectiveStart > todayStr();

  useEffect(() => {
    if (!queueTail) return;
    setForm((prev) =>
      prev.start_date >= queueTail
        ? prev
        : {
            ...prev,
            start_date: queueTail,
            end_date: addDays(queueTail, planDuration(prev.membership_type)),
          },
    );
    // planDuration only depends on plans, which are loaded before the student is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueTail]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "membership_type") {
        const type = value as MembershipType;
        next.end_date = endDateForType(type, prev.start_date);
        next.classes_total = defaultTotalSessions(type);
        next.price_paid = priceForType(type);
      }

      if (name === "start_date") {
        const type = prev.membership_type;
        next.end_date = endDateForType(type, value);
      }

      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const settlement = chargePayload(payment, pricePaid);
    const payload: CreateMembershipRequest = {
      student_id: activeStudentId,
      membership_type: form.membership_type,
      start_date: form.start_date,
      end_date: form.end_date,
      price_paid: pricePaid,
      payment_method: settlement.payment_method,
      payment_splits: settlement.payment_splits,
      payment_status: settlement.payment_status,
      balance_amount: settlement.balance_amount,
      classes_total: form.classes_total,
      notes: form.notes || undefined,
      duo_partner_id: isDuo ? form.duo_partner_id || undefined : undefined,
    };
    mutate(payload, {
      onSuccess: () => {
        setForm({ ...INITIAL_FORM, student_id: studentId ?? "" });
        setPayment({ ...EMPTY_CHARGE_PAYMENT, studentId: studentId ?? "" });
        onClose();
      },
    });
  }

  const showSessionPack = isSessionPack(form.membership_type);
  const isDuo = isDuoType(form.membership_type);
  const availablePartners = students.filter(
    (s) => s.student_id !== form.student_id && s.student_id !== (studentId ?? "")
  );

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
            {typeOptions.map(([val, label]) => (
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
        {isScheduled && (
          <div className="flex items-start gap-2 rounded-xl border border-[--color-info-bd] bg-[--color-info-bg] px-4 py-3 text-xs text-[--color-info]">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("memberships.queuedNotice", { date: formatDate(effectiveStart) })}</span>
          </div>
        )}

        {activeStudentId && pricePaid > 0 && (
          <ChargePaymentSection
            total={pricePaid}
            value={payment}
            onChange={patchPayment}
            hideBuyer
            allowPublic={false}
            inputClassName={inputCls}
            labelClassName="mb-1.5 block text-sm font-medium text-[--tx-primary]"
          />
        )}

        {isDuo && (
          <Field label="Pareja Dúo *">
            <select
              name="duo_partner_id"
              value={form.duo_partner_id}
              onChange={handleChange}
              required
              className={inputCls}
            >
              <option value="">— Selecciona la pareja —</option>
              {availablePartners.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.full_name} — {s.email}
                </option>
              ))}
            </select>
          </Field>
        )}

        {showSessionPack && (
          <Field label="Total de sesiones">
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
            className="rounded-xl border border-[--bd-subtle] px-5 py-2.5 text-sm font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !paymentReady}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 25px var(--gold-bg)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
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
      <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
