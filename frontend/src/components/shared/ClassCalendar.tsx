/**
 * Multi-view calendar for fitness classes.
 * Supports month, week, 3-day, and day views with color-coded class types.
 */

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Users, Clock, MapPin } from "lucide-react";
import { CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from "@/types/class";
import type { FitnessClass } from "@/types/class";
import { formatTime } from "@/lib/utils";

type CalendarView = "month" | "week" | "3day" | "day";

interface ClassCalendarProps {
  classes: FitnessClass[];
  onClassClick?: (cls: FitnessClass) => void;
  onDayClick?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAYS_OF_WEEK_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "3day", label: "3 Días" },
  { value: "day", label: "Hoy" },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Mon..6=Sun for a given Date. */
function getMondayBasedDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Format date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Add N days to a Date and return a new Date */
function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** Compute end time string from start_time (HH:MM) + duration in minutes */
function computeEndTime(start: string, durationMin: number): string {
  const [h, m] = start.slice(0, 5).split(":").map(Number);
  const totalMin = h * 60 + m + durationMin;
  const eh = Math.floor(totalMin / 60) % 24;
  const em = totalMin % 60;
  return formatTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
}

/** Get Monday of the week containing the given date */
function getMonday(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function ClassCalendar({
  classes,
  onClassClick,
  onDayClick,
  onMonthChange,
}: ClassCalendarProps): React.JSX.Element {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [calView, setCalView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(today);

  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

  /** Group classes by date string YYYY-MM-DD */
  const classesByDate = useMemo(() => {
    const map: Record<string, FitnessClass[]> = {};
    for (const cls of classes) {
      const key = cls.class_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(cls);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [classes]);

  // ── Month navigation ──
  const navigateMonth = useCallback((delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    if (newMonth > 11) { newMonth = 0; newYear += 1; }
    setViewYear(newYear);
    setViewMonth(newMonth);
    onMonthChange?.(newYear, newMonth);
  }, [viewMonth, viewYear, onMonthChange]);

  // ── Multi-view navigation ──
  const navigateView = useCallback((delta: number) => {
    if (calView === "month") {
      navigateMonth(delta);
    } else if (calView === "week") {
      setAnchorDate((prev) => addDays(prev, delta * 7));
    } else if (calView === "3day") {
      setAnchorDate((prev) => addDays(prev, delta * 3));
    } else {
      setAnchorDate((prev) => addDays(prev, delta));
    }
  }, [calView, navigateMonth]);

  function goToToday(): void {
    const y = today.getFullYear();
    const m = today.getMonth();
    setViewYear(y);
    setViewMonth(m);
    setAnchorDate(today);
    onMonthChange?.(y, m);
  }

  function handleViewChange(v: CalendarView): void {
    setCalView(v);
    if (v === "day") {
      setAnchorDate(today);
    } else if (v === "week") {
      setAnchorDate(getMonday(today));
    } else if (v === "3day") {
      setAnchorDate(today);
    }
  }

  // ── Compute visible days for non-month views ──
  const visibleDays = useMemo((): Date[] => {
    if (calView === "week") {
      const monday = getMonday(anchorDate);
      return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }
    if (calView === "3day") {
      return Array.from({ length: 3 }, (_, i) => addDays(anchorDate, i));
    }
    if (calView === "day") {
      return [anchorDate];
    }
    return [];
  }, [calView, anchorDate]);

  // ── Header title ──
  const headerTitle = useMemo((): string => {
    if (calView === "month") {
      return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    }
    if (calView === "day") {
      const wd = DAYS_OF_WEEK_FULL[getMondayBasedDay(anchorDate)];
      return `${wd} ${anchorDate.getDate()} de ${MONTH_NAMES[anchorDate.getMonth()]}`;
    }
    if (visibleDays.length > 0) {
      const first = visibleDays[0];
      const last = visibleDays[visibleDays.length - 1];
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} – ${last.getDate()} de ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
    }
    return "";
  }, [calView, viewMonth, viewYear, anchorDate, visibleDays]);

  const isAtToday = calView === "month"
    ? viewYear === today.getFullYear() && viewMonth === today.getMonth()
    : toDateStr(anchorDate) === todayStr;

  // ── Month grid cells ──
  const monthCells = useMemo(() => {
    if (calView !== "month") return [];
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = getMondayBasedDay(firstDayOfMonth);
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ day: null, dateStr: null });
      } else {
        const mm = String(viewMonth + 1).padStart(2, "0");
        const dd = String(dayNum).padStart(2, "0");
        cells.push({ day: dayNum, dateStr: `${viewYear}-${mm}-${dd}` });
      }
    }
    return cells;
  }, [calView, viewYear, viewMonth]);

  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[--bd-default] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[--tx-primary] sm:text-xl">
            {headerTitle}
          </h2>
          {!isAtToday && (
            <button
              onClick={goToToday}
              className="rounded-lg border border-[--bd-subtle] px-3 py-1.5 text-sm text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary] transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-0.5">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleViewChange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  calView === opt.value
                    ? "shadow-sm"
                    : "text-[--tx-muted] hover:text-[--tx-primary]"
                }`}
                style={
                  calView === opt.value
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

          {/* Prev / Next */}
          <button
            onClick={() => navigateView(-1)}
            className="rounded-xl border border-[--bd-subtle] p-2 text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary] transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigateView(1)}
            className="rounded-xl border border-[--bd-subtle] p-2 text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary] transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {calView === "month" && (
        <>
          <div className="grid grid-cols-7 border-b border-[--bd-default]">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              const dayClasses = cell.dateStr ? (classesByDate[cell.dateStr] ?? []) : [];
              const hasClasses = dayClasses.length > 0;
              return (
                <div
                  key={idx}
                  onClick={() => { if (cell.dateStr && onDayClick) onDayClick(cell.dateStr); }}
                  className={`min-h-[100px] border-b border-r border-[--bd-default]/60 p-2 transition-colors
                    ${cell.day === null ? "bg-[--bg-base]/30" : ""}
                    ${hasClasses && cell.day !== null ? "cursor-pointer hover:bg-[--bg-muted]/30" : ""}
                    ${idx % 7 === 6 ? "border-r-0" : ""}
                  `}
                >
                  {cell.day !== null && (
                    <>
                      <div
                        className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium
                          ${isToday ? "bg-[--color-success] text-[--tx-primary] font-bold" : "text-[--tx-muted]"}`}
                      >
                        {cell.day}
                      </div>
                      <div className="space-y-1">
                        {dayClasses.slice(0, 3).map((cls) => (
                          <MonthClassPill key={cls.class_id} cls={cls} onClick={onClassClick} />
                        ))}
                        {dayClasses.length > 3 && (
                          <div className="pl-1 text-xs text-[--tx-disabled]">+{dayClasses.length - 3} más</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── COLUMN VIEWS (week / 3-day / day) ── */}
      {calView !== "month" && (
        <>
          {/* Day column headers */}
          <div className={`grid border-b border-[--bd-default] ${colsClass(visibleDays.length)}`}>
            {visibleDays.map((d) => {
              const ds = toDateStr(d);
              const isToday = ds === todayStr;
              const wd = getMondayBasedDay(d);
              return (
                <div
                  key={ds}
                  className={`py-3 text-center border-r last:border-r-0 border-[--bd-default]/60 ${isToday ? "bg-[--color-success-bg]" : ""}`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">
                    {DAYS_OF_WEEK[wd]}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? "text-[--color-success]" : "text-[--tx-primary]"}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Class columns */}
          <div className={`grid ${colsClass(visibleDays.length)}`}>
            {visibleDays.map((d) => {
              const ds = toDateStr(d);
              const dayClasses = classesByDate[ds] ?? [];
              const isToday = ds === todayStr;
              return (
                <div
                  key={ds}
                  className={`min-h-[300px] border-r last:border-r-0 border-[--bd-default]/60 p-2 space-y-2 ${isToday ? "bg-[--color-success-bg]/30" : ""}`}
                >
                  {dayClasses.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[--tx-disabled]">Sin clases</p>
                  ) : (
                    dayClasses.map((cls) => (
                      <ColumnClassCard key={cls.class_id} cls={cls} onClick={onClassClick} expanded={calView === "day"} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers & Sub-components ──────────────────────────────────────────────

function colsClass(n: number): string {
  if (n === 1) return "grid-cols-1";
  if (n === 3) return "grid-cols-3";
  return "grid-cols-7";
}

/** Compact pill used in month view cells */
function MonthClassPill({
  cls,
  onClick,
}: {
  cls: FitnessClass;
  onClick?: (c: FitnessClass) => void;
}): React.JSX.Element {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(cls); }}
      className={`w-full rounded-md px-1.5 py-1 text-left text-xs transition-opacity hover:opacity-80
        ${cls.is_cancelled ? "opacity-40 line-through" : ""}
        ${CLASS_TYPE_COLORS[cls.class_type] || "bg-[--bg-muted] text-[--tx-primary] border-[--bd-subtle]"}`}
    >
      <div className="font-semibold truncate">
        {formatTime(cls.start_time)} {CLASS_TYPE_LABELS[cls.class_type] ?? cls.class_type}
      </div>
      <div className="flex items-center gap-0.5 truncate opacity-75">
        <Users className="h-2.5 w-2.5" />
        {cls.reservations_count}/{cls.capacity}
      </div>
    </button>
  );
}

/** Richer card used in week/3-day/day column views */
function ColumnClassCard({
  cls,
  onClick,
  expanded,
}: {
  cls: FitnessClass;
  onClick?: (c: FitnessClass) => void;
  expanded?: boolean;
}): React.JSX.Element {
  const typeColor = CLASS_TYPE_COLORS[cls.class_type] || "bg-[--bg-muted] text-[--tx-primary] border-[--bd-subtle]";
  return (
    <button
      onClick={() => onClick?.(cls)}
      className={`w-full rounded-xl text-left transition-all hover:shadow-md hover:scale-[1.01]
        ${cls.is_cancelled ? "opacity-40" : ""}
        ${typeColor} ${expanded ? "p-4" : "p-2.5"}`}
    >
      <div className={`font-semibold ${cls.is_cancelled ? "line-through" : ""} ${expanded ? "text-sm" : "text-xs"}`}>
        {CLASS_TYPE_LABELS[cls.class_type] ?? cls.class_type}
      </div>
      <div className={`mt-1 flex items-center gap-1.5 opacity-80 ${expanded ? "text-xs" : "text-[10px]"}`}>
        <Clock className="h-3 w-3" />
        {formatTime(cls.start_time)} – {computeEndTime(cls.start_time, cls.duration_minutes)}
      </div>
      <div className={`mt-0.5 flex items-center gap-1.5 opacity-80 ${expanded ? "text-xs" : "text-[10px]"}`}>
        <Users className="h-3 w-3" />
        {cls.reservations_count}/{cls.capacity}
        {cls.waitlist_count > 0 && (
          <span className="ml-1 text-[--color-warning]">+{cls.waitlist_count} espera</span>
        )}
      </div>
      {expanded && cls.location && (
        <div className="mt-0.5 flex items-center gap-1.5 text-xs opacity-70">
          <MapPin className="h-3 w-3" />
          {cls.location}
        </div>
      )}
      {expanded && cls.instructor_name && (
        <div className="mt-1 text-xs opacity-70">
          {cls.instructor_name}
        </div>
      )}
    </button>
  );
}
