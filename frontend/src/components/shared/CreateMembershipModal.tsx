/** Modal form for assigning a membership to a student. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { Dialog } from "./Dialog";
import { useAssignMembership } from "@/hooks/useMemberships";
import { useStudents } from "@/hooks/useStudents";
import { useStudentBalance, useApplyBalance } from "@/hooks/useBalance";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import type { CreateMembershipRequest, MembershipType } from "@/types/membership";
import { MEMBERSHIP_TYPE_LABELS, MEMBERSHIP_DEFAULT_PRICE } from "@/types/membership";
import type { PaymentMethod, PaymentSplit } from "@/types/transaction";
import { formatCurrency } from "@/lib/utils";
import { isPaymentComplete, splitsForPayload } from "@/lib/payments";
import { PaymentMethodField } from "./PaymentMethodField";

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
  payment_method: "cash" as PaymentMethod,
  payment_splits: [] as PaymentSplit[],
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
  const [applyBalance, setApplyBalance] = useState(false);
  const { mutate, isPending } = useAssignMembership();
  const applyBalanceMutation = useApplyBalance();
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

  function endDateForType(type: MembershipType, startDate: string): string {
    const plan = planMap.get(type);
    const days = plan?.duration_days ?? 30;
    return addDays(startDate, days);
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
  const { data: balance } = useStudentBalance(activeStudentId || undefined);
  const currentBalance = balance?.current_balance ?? 0;
  const pricePaid = Number(form.price_paid) || 0;
  const balanceToApply = applyBalance ? Math.min(currentBalance, pricePaid) : 0;
  const remainingToPay = pricePaid - balanceToApply;
  const paymentReady =
    pricePaid <= 0 || isPaymentComplete(pricePaid, form.payment_method, form.payment_splits);

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
    const payload: CreateMembershipRequest = {
      student_id: form.student_id,
      membership_type: form.membership_type,
      start_date: form.start_date,
      end_date: form.end_date,
      price_paid: Number(form.price_paid),
      payment_method: form.payment_method,
      payment_splits: splitsForPayload(form.payment_method, form.payment_splits),
      classes_total: form.classes_total,
      notes: form.notes || undefined,
      duo_partner_id: isDuo ? form.duo_partner_id || undefined : undefined,
    };
    mutate(payload, {
      onSuccess: (newMembership) => {
        if (applyBalance && balanceToApply > 0 && newMembership?.membership_id) {
          applyBalanceMutation.mutate({
            studentId: activeStudentId,
            data: {
              amount: balanceToApply,
              membership_id: newMembership.membership_id,
            },
          });
        }
        setForm({ ...INITIAL_FORM, student_id: studentId ?? "" });
        setApplyBalance(false);
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
        <Field label="Método de pago *">
          <PaymentMethodField
            total={pricePaid}
            method={form.payment_method}
            splits={form.payment_splits}
            inputClassName={inputCls}
            onChange={(payment_method, payment_splits) =>
              setForm((prev) => ({ ...prev, payment_method, payment_splits }))
            }
          />
        </Field>

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

        {/* Apply balance section */}
        {currentBalance > 0 && (
          <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyBalance}
                onChange={(e) => setApplyBalance(e.target.checked)}
                className="h-4 w-4 rounded accent-[--gold]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[--gold]" />
                  <span className="text-sm font-semibold text-[--tx-primary]">
                    {t("balance.applyQuestion")}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[--tx-muted]">
                  {t("balance.availableBalance", { amount: formatCurrency(currentBalance) })}
                </p>
              </div>
            </label>
            {applyBalance && balanceToApply > 0 && (
              <div className="mt-3 space-y-1 rounded-lg border border-[--bd-subtle] bg-[--bg-muted] px-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[--tx-muted]">{t("balance.applyAmount", { amount: formatCurrency(balanceToApply) })}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-[--tx-primary]">{t("balance.remaining", { amount: formatCurrency(remainingToPay) })}</span>
                </div>
              </div>
            )}
          </div>
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
