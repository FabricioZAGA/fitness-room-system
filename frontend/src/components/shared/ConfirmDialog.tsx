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
}: ConfirmDialogProps): React.JSX.Element | null {
  const isDanger = variant === "danger";

  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: isDanger
              ? "rgba(239, 68, 68, 0.1)"
              : "rgba(245, 158, 11, 0.1)",
          }}
        >
          <AlertTriangle
            className="h-6 w-6"
            style={{ color: isDanger ? "#ef4444" : "#f59e0b" }}
          />
        </div>
        <p className="text-sm text-[--tx-muted]">{description}</p>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm font-medium text-[--tx-primary] transition-colors hover:bg-[--bg-muted] disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{
            backgroundColor: isDanger ? "#dc2626" : "#d97706",
          }}
        >
          {loading ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
