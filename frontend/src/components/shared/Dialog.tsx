/** Reusable modal dialog — no external dependency, pure Tailwind + React portal. */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: DialogProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        ref={ref}
        className={cn(
          "relative w-full rounded-2xl border border-[--bd-default] shadow-2xl",
          widths[size]
        )}
        style={{ backgroundColor: "var(--bg-elevated)" }}
      >
        <div className="flex items-start justify-between border-b border-[--bd-default] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[--tx-primary]">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-[--tx-disabled]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-[--tx-disabled] transition-colors hover:bg-[--bg-muted] hover:text-[--tx-primary]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
