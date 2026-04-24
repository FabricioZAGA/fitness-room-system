/** Admin card showing the SES suppression list with unblock action. */

import { useState } from "react";
import {
  MailX,
  RefreshCw,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useSuppressions, useDeleteSuppression } from "@/hooks/useEmailAdmin";
import { ConfirmDialog } from "./ConfirmDialog";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ReasonBadge({ reason }: { reason: string }): React.JSX.Element {
  const isBounce = reason === "BOUNCE";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: isBounce
          ? "var(--color-danger-bg)"
          : "var(--color-warning-bg)",
        color: isBounce ? "var(--color-danger)" : "var(--color-warning)",
        border: `1px solid ${
          isBounce ? "var(--color-danger-bd)" : "var(--color-warning-bd)"
        }`,
      }}
    >
      <AlertTriangle className="h-3 w-3" />
      {isBounce ? "Rebote" : reason === "COMPLAINT" ? "Reporte spam" : reason}
    </span>
  );
}

export function SuppressionCard(): React.JSX.Element {
  const { data, isLoading, isFetching, refetch } = useSuppressions();
  const { mutate: removeSuppression, isPending, variables: removing } =
    useDeleteSuppression();
  const [confirming, setConfirming] = useState<string | null>(null);

  const items = data?.items ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MailX className="h-5 w-5 text-[--color-danger]" />
            <h3 className="text-base font-semibold text-[--tx-primary]">
              Salud de entrega de correos
            </h3>
          </div>
          <p className="mt-1 text-sm text-[--tx-muted]">
            Direcciones bloqueadas por AWS SES por rebote o reporte de spam.
            Si corriges el correo, elimínalo aquí para poder reenviar la
            invitación.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refrescar"
          className="shrink-0 rounded-lg p-2 text-[--tx-muted] hover:bg-[--bg-muted] hover:text-[--tx-primary] transition-colors disabled:opacity-50"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[--gold]" />
        </div>
      ) : count === 0 ? (
        <div className="rounded-xl bg-[--color-success-bg] border border-[--color-success-bd] p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[--color-success]" />
          <p className="text-sm text-[--color-success]">
            No hay direcciones suprimidas. Todos los correos se están entregando.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-[--tx-disabled]">
            {count} {count === 1 ? "dirección suprimida" : "direcciones suprimidas"}
          </p>
          <div className="grid gap-2">
            {items.map((it) => {
              const isRemovingThis = isPending && removing === it.email;
              return (
                <div
                  key={it.email}
                  className="flex items-center gap-3 rounded-xl border border-[--bd-default] bg-[--bg-muted] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-medium text-[--tx-primary]">
                        {it.email}
                      </p>
                      <ReasonBadge reason={it.reason} />
                    </div>
                    <p className="mt-0.5 text-xs text-[--tx-disabled]">
                      Desde {formatTimestamp(it.last_update_time)}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirming(it.email)}
                    disabled={isRemovingThis}
                    title="Quitar de la lista de supresión"
                    className="shrink-0 rounded-lg p-2 text-[--color-danger] hover:bg-[--color-danger-bg] transition-colors disabled:opacity-50"
                  >
                    {isRemovingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) removeSuppression(confirming);
          setConfirming(null);
        }}
        title="Quitar de supresión"
        description={
          `¿Quitar ${confirming ?? ""} de la lista de supresión de SES? ` +
          `El sistema podrá volver a enviar correos a esa dirección. ` +
          `Si la causa original no se corrigió, volverá a rebotar.`
        }
        confirmLabel="Quitar"
        variant="warning"
      />
    </div>
  );
}
