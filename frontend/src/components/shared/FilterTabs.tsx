/** Reusable filter tab bar with gold active state. */

interface FilterOption<T extends string> {
  label: string;
  value: T;
}

interface FilterTabsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: FilterTabsProps<T>): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            value === opt.value
              ? "shadow-md"
              : "bg-[--bg-muted] text-[--tx-muted] hover:text-[--tx-primary]"
          }`}
          style={
            value === opt.value
              ? {
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }
              : undefined
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
