/**
 * Modal that warns the user their session is about to expire and offers to
 * extend it. Disables backdrop/Escape dismissal — the user must make a choice.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { setKeepSession } from "@/lib/sessionPreferences";

interface SessionExpiryModalProps {
  open: boolean;
  secondsLeft: number;
  onExtend: () => Promise<boolean>;
  onLogout: () => void | Promise<void>;
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SessionExpiryModal({
  open,
  secondsLeft,
  onExtend,
  onLogout,
}: SessionExpiryModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [dontAsk, setDontAsk] = useState(false);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (open) {
      setDontAsk(false);
      setExtending(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleExtend(): Promise<void> {
    setExtending(true);
    const ok = await onExtend();
    setExtending(false);
    if (!ok) {
      toast.error(t("session.extendFailed"));
      return;
    }
    if (dontAsk) {
      setKeepSession(true);
      toast.success(t("session.keepEnabled"));
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[--bd-default] shadow-2xl"
        style={{ backgroundColor: "var(--bg-elevated)" }}
      >
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <div
            className="rounded-full p-4"
            style={{ background: "var(--color-warning-bg)" }}
          >
            <AlertTriangle className="h-8 w-8" style={{ color: "var(--color-warning)" }} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[--tx-primary]">
              {t("session.expiringTitle")}
            </h2>
            <p className="mt-2 text-sm text-[--tx-muted]">
              {t("session.expiringSubtitle")}
            </p>
          </div>

          <div
            className="flex items-center gap-2 rounded-xl border border-[--bd-default] px-4 py-2"
            style={{ background: "var(--bg-muted)" }}
          >
            <Clock className="h-4 w-4 text-[--gold]" />
            <span className="text-xs uppercase tracking-wide text-[--tx-muted]">
              {t("session.expiresIn")}
            </span>
            <span className="font-mono text-lg font-semibold text-[--tx-primary]">
              {formatCountdown(secondsLeft)}
            </span>
          </div>

          <label className="mt-2 flex w-full cursor-pointer items-start gap-3 rounded-xl border border-[--bd-subtle] px-4 py-3 text-left transition-colors hover:bg-[--bg-muted]">
            <input
              type="checkbox"
              checked={dontAsk}
              onChange={(e) => setDontAsk(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[--gold]"
            />
            <div>
              <div className="text-sm font-medium text-[--tx-primary]">
                {t("session.dontAskAgain")}
              </div>
              <div className="text-xs text-[--tx-muted]">
                {t("session.dontAskAgainHelp")}
              </div>
            </div>
          </label>

          <div className="flex w-full gap-3 pt-2">
            <button
              type="button"
              onClick={onLogout}
              disabled={extending}
              className="flex-1 rounded-xl border border-[--bd-default] px-4 py-3 text-sm font-medium text-[--tx-primary] transition-colors hover:bg-[--bg-muted] disabled:opacity-50"
            >
              {t("session.logoutNow")}
            </button>
            <button
              type="button"
              onClick={handleExtend}
              disabled={extending}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              {extending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("session.extending")}
                </span>
              ) : (
                t("session.extend")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
