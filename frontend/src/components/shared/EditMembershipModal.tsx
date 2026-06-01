/** Modal form for editing an existing membership. */

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { useUpdateMembership } from "@/hooks/useMemberships";
import type {
  Membership,
  MembershipStatus,
  UpdateMembershipRequest,
} from "@/types/membership";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";

interface EditMembershipModalProps {
  open: boolean;
  onClose: () => void;
  membership: Membership | null;
}

const STATUS_OPTIONS: { value: MembershipStatus; label: string }[] = [
  { value: "active", label: "Activa" },
  { value: "frozen", label: "Congelada" },
  { value: "expired", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
  { value: "pending", label: "Pendiente" },
];

export function EditMembershipModal({
  open,
  onClose,
  membership,
}: EditMembershipModalProps): React.JSX.Element {
  const [form, setForm] = useState({
    end_date: "",
    price_paid: 0,
    classes_remaining: undefined as number | undefined,
    status: "active" as MembershipStatus,
    notes: "",
  });

  const { mutate, isPending } = useUpdateMembership(
    membership?.student_id ?? "",
    membership?.membership_id ?? ""
  );

  useEffect(() => {
    if (!membership) return;
    setForm({
      end_date: membership.end_date,
      price_paid: membership.price_paid,
      classes_remaining: membership.classes_remaining ?? undefined,
      status: membership.status,
      notes: membership.notes ?? "",
    });
  }, [membership]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!membership) return;

    const payload: UpdateMembershipRequest = {};
    if (form.end_date && form.end_date !== membership.end_date) {
      payload.end_date = form.end_date;
    }
    if (Number(form.price_paid) !== membership.price_paid) {
      payload.price_paid = Number(form.price_paid);
    }
    if (
      form.classes_remaining !== undefined &&
      form.classes_remaining !== membership.classes_remaining
    ) {
      payload.classes_remaining = form.classes_remaining;
    }
    if (form.status !== membership.status) {
      payload.status = form.status;
    }
    if ((form.notes || "") !== (membership.notes || "")) {
      payload.notes = form.notes;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    mutate(payload, { onSuccess: () => onClose() });
  }

  if (!membership) return <></>;

  const planLabel =
    MEMBERSHIP_TYPE_LABELS[membership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] ??
    membership.membership_type;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editar Membresía"
      description={`${planLabel} — ${membership.start_date} → ${membership.end_date}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Fecha de vencimiento">
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio pagado (MXN)">
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price_paid}
              onChange={(e) =>
                setForm((p) => ({ ...p, price_paid: Number(e.target.value) }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="Estado">
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value as MembershipStatus }))
              }
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

        {membership.classes_total !== null && (
          <Field label={`Clases restantes (de ${membership.classes_total})`}>
            <input
              type="number"
              min={0}
              max={membership.classes_total}
              value={form.classes_remaining ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  classes_remaining: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className={inputCls}
            />
          </Field>
        )}

        <Field label="Notas">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
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
              boxShadow: "0 10px 25px var(--gold-bg)",
            }}
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
