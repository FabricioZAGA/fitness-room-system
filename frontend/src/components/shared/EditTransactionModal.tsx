/** Modal form for admin-only editing of an existing transaction. */

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { useUpdateTransaction } from "@/hooks/useTransactions";
import type {
  Transaction,
  PaymentMethod,
  TransactionType,
  UpdateTransactionRequest,
} from "@/types/transaction";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/types/transaction";
import { formatCurrency } from "@/lib/utils";

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function EditTransactionModal({
  open,
  onClose,
  transaction,
}: EditTransactionModalProps): React.JSX.Element {
  const [form, setForm] = useState({
    amount: 0,
    payment_method: "cash" as PaymentMethod,
    transaction_type: "other" as TransactionType,
    notes: "",
  });
  const [showAmountConfirm, setShowAmountConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<UpdateTransactionRequest | null>(null);

  const { mutate, isPending } = useUpdateTransaction(
    transaction?.transaction_id ?? "",
  );

  useEffect(() => {
    if (!transaction) return;
    setForm({
      amount: transaction.amount,
      payment_method: transaction.payment_method,
      transaction_type: transaction.transaction_type,
      notes: transaction.notes ?? "",
    });
  }, [transaction]);

  function buildPayload(): UpdateTransactionRequest {
    if (!transaction) return {};
    const payload: UpdateTransactionRequest = {};
    if (form.amount !== transaction.amount) payload.amount = form.amount;
    if (form.payment_method !== transaction.payment_method)
      payload.payment_method = form.payment_method;
    if (form.transaction_type !== transaction.transaction_type)
      payload.transaction_type = form.transaction_type;
    if ((form.notes || "") !== (transaction.notes || ""))
      payload.notes = form.notes;
    return payload;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    if (payload.amount !== undefined) {
      setPendingPayload(payload);
      setShowAmountConfirm(true);
      return;
    }
    mutate({ data: payload }, { onSuccess: () => onClose() });
  }

  function handleConfirmAmount(): void {
    if (!pendingPayload) return;
    mutate(
      { data: pendingPayload, confirm: true },
      {
        onSuccess: () => {
          setShowAmountConfirm(false);
          setPendingPayload(null);
          onClose();
        },
      },
    );
  }

  if (!transaction) return <></>;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Editar Transacción"
        description={`${TRANSACTION_TYPE_LABELS[transaction.transaction_type]} — ${formatCurrency(transaction.amount)}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto (MXN)">
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: Number(e.target.value) }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Método de pago">
              <select
                value={form.payment_method}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    payment_method: e.target.value as PaymentMethod,
                  }))
                }
                className={inputCls}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Tipo de transacción">
            <select
              value={form.transaction_type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  transaction_type: e.target.value as TransactionType,
                }))
              }
              className={inputCls}
            >
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

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
                background:
                  "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
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
        open={showAmountConfirm}
        onClose={() => {
          setShowAmountConfirm(false);
          setPendingPayload(null);
        }}
        onConfirm={handleConfirmAmount}
        title="Confirmar cambio de monto"
        description={`¿Estás seguro de cambiar el monto de ${formatCurrency(transaction.amount)} a ${formatCurrency(form.amount)}? Esta operación es de alto riesgo.`}
        confirmLabel="Sí, cambiar monto"
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
      <label className="mb-1.5 block text-sm font-medium text-[--tx-primary]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
