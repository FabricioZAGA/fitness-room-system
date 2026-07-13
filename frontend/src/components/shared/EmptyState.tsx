/** Reusable empty state placeholder with icon and message. */

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="py-16 text-center">
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: "var(--bg-muted)",
          border: "1px solid var(--bd-default)",
        }}
      >
        <Icon className="h-7 w-7 text-[--tx-disabled]" />
      </div>
      <p className="text-sm text-[--tx-muted]">{message}</p>
    </div>
  );
}
