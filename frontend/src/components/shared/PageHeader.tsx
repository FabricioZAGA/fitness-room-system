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
        <h1 className="text-2xl font-bold tracking-tight text-[--tx-primary] lg:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-[--tx-muted]">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            color: "var(--gold-fg)",
            boxShadow: "var(--shadow-gold)",
          }}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
