/** "What's New" dialog that shows changelog entries to users.
 *
 * Automatically opens when there are unseen entries (based on version in localStorage).
 * Can also be triggered manually from the settings page.
 */

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  changelog,
  hasUnseenChangelog,
  markChangelogSeen,
  APP_VERSION,
} from "@/lib/changelog";

export function WhatsNewDialog(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasUnseenChangelog()) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleClose(): void {
    markChangelogSeen();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative mx-4 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-[--bd-default] bg-[--bg-surface] shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl px-6 py-6">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              opacity: 0.1,
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[--tx-primary]">Novedades</h2>
                <p className="text-sm text-[--tx-muted]">Versión {APP_VERSION}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-[--tx-disabled] hover:bg-[--bg-muted] hover:text-[--tx-primary] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          {changelog.map((entry) => (
            <div key={entry.version} className="mt-4 first:mt-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-[--gold-bg] px-2 py-0.5 text-xs font-bold text-[--gold]">
                  v{entry.version}
                </span>
                <span className="text-xs text-[--tx-disabled]">{entry.date}</span>
              </div>
              <h3 className="mb-3 text-sm font-semibold text-[--tx-primary]">{entry.title}</h3>
              <ul className="space-y-2.5">
                {entry.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-[--tx-muted]">
                    <span className="shrink-0 text-base">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[--bd-default] px-6 py-4">
          <button
            onClick={handleClose}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
