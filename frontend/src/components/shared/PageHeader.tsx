/** Reusable page header with title, subtitle, and optional action button. */

import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[--tx-primary]">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[--tx-muted]">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            color: "var(--gold-fg)",
            boxShadow: "0 4px 16px var(--gold-bg)",
          }}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
