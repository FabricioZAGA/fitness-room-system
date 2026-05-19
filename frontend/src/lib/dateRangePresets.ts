/** Date range preset helpers for report filters (Mexico timezone). */

export type RangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRange {
  start: string;
  end: string;
}

const TZ = "America/Mexico_City";

function toIsoDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function nowInMx(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

export function rangeForPreset(preset: RangePreset, fallback: DateRange): DateRange {
  const today = nowInMx();
  const todayIso = toIsoDate(today);

  switch (preset) {
    case "today":
      return { start: todayIso, end: todayIso };

    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yIso = toIsoDate(y);
      return { start: yIso, end: yIso };
    }

    case "thisWeek": {
      // Lunes como inicio de semana (México)
      const dow = today.getDay(); // 0=Sunday
      const diff = (dow + 6) % 7; // distance from Monday
      const monday = new Date(today);
      monday.setDate(monday.getDate() - diff);
      return { start: toIsoDate(monday), end: todayIso };
    }

    case "thisMonth": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toIsoDate(first), end: todayIso };
    }

    case "lastMonth": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toIsoDate(first), end: toIsoDate(last) };
    }

    case "custom":
    default:
      return fallback;
  }
}

export function detectPreset(range: DateRange): RangePreset {
  const presets: RangePreset[] = ["today", "yesterday", "thisWeek", "thisMonth", "lastMonth"];
  for (const p of presets) {
    const r = rangeForPreset(p, range);
    if (r.start === range.start && r.end === range.end) return p;
  }
  return "custom";
}
