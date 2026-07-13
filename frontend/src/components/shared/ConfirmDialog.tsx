/** Reusable confirmation dialog for destructive actions. */

import { AlertTriangle } from "lucide-react";
import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  children,
}: ConfirmDialogProps): React.JSX.Element | null {
  const isDanger = variant === "danger";

  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: isDanger
              ? "var(--color-danger-bg)"
              : "var(--color-warning-bg)",
            border: `1px solid ${isDanger ? "var(--color-danger-bd)" : "var(--color-warning-bd)"}`,
          }}
        >
          <AlertTriangle
            className="h-6 w-6"
            style={{ color: isDanger ? "var(--color-danger)" : "var(--color-warning)" }}
          />
        </div>
        <p className="text-sm text-[--tx-muted]">{description}</p>
        {children}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm font-medium text-[--tx-primary] transition-all duration-200 hover:bg-[--bg-muted] hover:border-[--gold-bd] disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50"
          style={{
            background: isDanger
              ? "linear-gradient(135deg, var(--color-danger) 0%, #b91c1c 100%)"
              : "linear-gradient(135deg, var(--color-warning) 0%, #b45309 100%)",
          }}
        >
          {loading ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
