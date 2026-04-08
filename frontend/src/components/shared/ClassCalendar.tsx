/**
 * Monthly calendar view for fitness classes.
 * Shows classes organized by day with color-coded class types.
 */

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from "@/types/class";
import type { FitnessClass } from "@/types/class";
import { formatTime } from "@/lib/utils";

interface ClassCalendarProps {
  classes: FitnessClass[];
  onClassClick?: (cls: FitnessClass) => void;
  onDayClick?: (date: string) => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Mon..6=Sun for a given Date. */
function getMondayBasedDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function ClassCalendar({
  classes,
  onClassClick,
  onDayClick,
}: ClassCalendarProps): React.JSX.Element {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = today.toISOString().slice(0, 10);

  /** Group classes by date string YYYY-MM-DD */
  const classesByDate = useMemo(() => {
    const map: Record<string, FitnessClass[]> = {};
    for (const cls of classes) {
      const key = cls.class_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(cls);
    }
    // Sort each day's classes by start_time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [classes]);

  function prevMonth(): void {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth(): void {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday(): void {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = getMondayBasedDay(firstDayOfMonth); // blanks before day 1

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

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[--bd-default] px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-[--tx-primary]">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="rounded-lg border border-[--bd-subtle] px-3 py-1.5 text-sm text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary] transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="rounded-xl border border-[--bd-subtle] p-2 text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary] transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="rounded-xl border border-[--bd-subtle] p-2 text-[--tx-muted] hover:border-[--bd-default] hover:text-[--tx-primary] transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
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

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;
          const dayClasses = cell.dateStr ? (classesByDate[cell.dateStr] ?? []) : [];
          const hasClasses = dayClasses.length > 0;

          return (
            <div
              key={idx}
              onClick={() => {
                if (cell.dateStr && onDayClick) onDayClick(cell.dateStr);
              }}
              className={`min-h-[100px] border-b border-r border-[--bd-default]/60 p-2 transition-colors
                ${cell.day === null ? "bg-[--bg-base]/30" : ""}
                ${hasClasses && cell.day !== null ? "cursor-pointer hover:bg-[--bg-muted]/30" : ""}
                ${idx % 7 === 6 ? "border-r-0" : ""}
              `}
            >
              {cell.day !== null && (
                <>
                  {/* Day number */}
                  <div
                    className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium
                      ${isToday
                        ? "bg-[--color-success] text-[--tx-primary] font-bold"
                        : "text-[--tx-muted]"
                      }`}
                  >
                    {cell.day}
                  </div>

                  {/* Classes */}
                  <div className="space-y-1">
                    {dayClasses.slice(0, 3).map((cls) => (
                      <button
                        key={cls.class_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClassClick?.(cls);
                        }}
                        className={`w-full rounded-md px-1.5 py-1 text-left text-xs transition-opacity hover:opacity-80
                          ${cls.is_cancelled ? "opacity-40 line-through" : ""}
                          ${CLASS_TYPE_COLORS[cls.class_type] || "bg-[--bg-muted] text-[--tx-primary] border-[--bd-subtle]"}`}
                      >
                        <div className="font-semibold truncate">
                          {formatTime(cls.start_time)} {CLASS_TYPE_LABELS[cls.class_type]}
                        </div>
                        <div className="flex items-center gap-0.5 truncate opacity-75">
                          <Users className="h-2.5 w-2.5" />
                          {cls.reservations_count}/{cls.capacity}
                        </div>
                      </button>
                    ))}
                    {dayClasses.length > 3 && (
                      <div className="pl-1 text-xs text-[--tx-disabled]">
                        +{dayClasses.length - 3} más
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
