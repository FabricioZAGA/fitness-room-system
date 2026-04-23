/** Reusable empty state placeholder with icon and message. */

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="py-16 text-center text-[--tx-muted]">
      <Icon className="mx-auto mb-3 h-12 w-12 text-[--tx-disabled]" />
      <p>{message}</p>
    </div>
  );
}
