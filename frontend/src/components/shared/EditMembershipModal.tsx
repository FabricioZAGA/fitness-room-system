/** Modal form for editing an existing membership. */

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { useUpdateMembership } from "@/hooks/useMemberships";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Membership,
  MembershipStatus,
  MembershipType,
  UpdateMembershipRequest,
} from "@/types/membership";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { PAYMENT_METHOD_LABELS } from "@/types/transaction";

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
  const { isAdmin } = useAuth();
  const [showTypeConfirm, setShowTypeConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<UpdateMembershipRequest | null>(null);

  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    membership_type: "room_daily" as MembershipType,
    price_paid: 0,
    payment_method: "cash",
    classes_total: undefined as number | undefined,
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
      start_date: membership.start_date,
      end_date: membership.end_date,
      membership_type: membership.membership_type,
      price_paid: membership.price_paid,
      payment_method: "cash",
      classes_total: membership.classes_total ?? undefined,
      classes_remaining: membership.classes_remaining ?? undefined,
      status: membership.status,
      notes: membership.notes ?? "",
    });
  }, [membership]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!membership) return;

    const payload: UpdateMembershipRequest = {};
    if (isAdmin && form.start_date && form.start_date !== membership.start_date) {
      payload.start_date = form.start_date;
    }
    if (form.end_date && form.end_date !== membership.end_date) {
      payload.end_date = form.end_date;
    }
    if (isAdmin && form.membership_type !== membership.membership_type) {
      payload.membership_type = form.membership_type;
    }
    if (Number(form.price_paid) !== membership.price_paid) {
      payload.price_paid = Number(form.price_paid);
    }
    if (isAdmin && form.payment_method) {
      payload.payment_method = form.payment_method;
    }
    if (
      isAdmin &&
      form.classes_total !== undefined &&
      form.classes_total !== membership.classes_total
    ) {
      payload.classes_total = form.classes_total;
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

    // Double-confirm for membership type change
    if (payload.membership_type) {
      setPendingPayload(payload);
      setShowTypeConfirm(true);
      return;
    }

    mutate(payload, { onSuccess: () => onClose() });
  }

  if (!membership) return <></>;

  const planLabel =
    MEMBERSHIP_TYPE_LABELS[membership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] ??
    membership.membership_type;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Editar Membresia"
        description={`${planLabel} — ${membership.start_date} → ${membership.end_date}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin-only: start_date & membership_type */}
          {isAdmin && (
            <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[--gold]">Admin</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de inicio">
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Tipo de membresia">
                  <select
                    value={form.membership_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, membership_type: e.target.value as MembershipType }))
                    }
                    className={inputCls}
                  >
                    {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Metodo de pago">
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
                    className={inputCls}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Clases totales">
                  <input
                    type="number"
                    min={1}
                    value={form.classes_total ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        classes_total: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className={inputCls}
                    placeholder="Solo paquetes"
                  />
                </Field>
              </div>
            </div>
          )}

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
            <Field label={`Clases restantes (de ${form.classes_total ?? membership.classes_total})`}>
              <input
                type="number"
                min={0}
                max={form.classes_total ?? membership.classes_total ?? 999}
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
              placeholder="Informacion adicional..."
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

      <ConfirmDialog
        open={showTypeConfirm}
        onClose={() => {
          setShowTypeConfirm(false);
          setPendingPayload(null);
        }}
        onConfirm={() => {
          if (!pendingPayload) return;
          mutate(pendingPayload, {
            onSuccess: () => {
              setShowTypeConfirm(false);
              setPendingPayload(null);
              onClose();
            },
          });
        }}
        title="Confirmar cambio de tipo"
        description={`¿Estas seguro de cambiar el tipo de membresia de "${planLabel}" a "${MEMBERSHIP_TYPE_LABELS[form.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] ?? form.membership_type}"? Esto puede afectar el acceso del alumno.`}
        confirmLabel="Si, cambiar tipo"
        variant="warning"
        loading={isPending}
      />
    </>
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
