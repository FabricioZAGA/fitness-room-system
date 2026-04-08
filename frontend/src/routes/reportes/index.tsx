import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  TrendingUp,
  Trophy,
  UserX,
  DollarSign,
  CalendarDays,
  Mail,
  Phone,
} from "lucide-react";
import {
  useIncomeReport,
  useAttendanceSummary,
  useRankings,
  useInactiveStudents,
} from "@/hooks/useReports";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { IncomeDay } from "@/types/report";
import { useGymStore } from "@/store/useGymStore";

export const Route = createFileRoute("/reportes/")({
  component: ReportesPage,
});

type Tab = "income" | "attendance" | "rankings" | "inactive";

// ─── Shared active-state style (solid gold, matches primary button) ──────────
const goldActiveStyle = {
  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
  color: "var(--gold-fg)",
  border: "1px solid transparent",
} as const;

/** Primary tab button — solid gold when active */
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
      style={
        active
          ? goldActiveStyle
          : {
              border: "1px solid var(--bd-default)",
              background: "var(--bg-surface)",
              color: "var(--tx-muted)",
            }
      }
    >
      {children}
    </button>
  );
}

/** Compact pill for day-range toggles */
function DayPill({
  days,
  active,
  onClick,
  prefix = "",
}: {
  days: number;
  active: boolean;
  onClick: () => void;
  prefix?: string;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
      style={
        active
          ? goldActiveStyle
          : {
              border: "1px solid var(--bd-default)",
              background: "transparent",
              color: "var(--tx-muted)",
            }
      }
    >
      {prefix}{days} días
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReportesPage(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("income");
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const defaultInactiveDays = useGymStore((s) => s.inactiveDays);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [attendanceDays, setAttendanceDays] = useState(30);
  const [rankingDays, setRankingDays] = useState(30);
  const [inactiveDays, setInactiveDays] = useState(defaultInactiveDays);

  const { data: income, isLoading: incomeLoading } = useIncomeReport({
    start_date: startDate,
    end_date: endDate,
  });
  const { data: attendance, isLoading: attendanceLoading } =
    useAttendanceSummary(attendanceDays);
  const { data: rankings = [], isLoading: rankingsLoading } = useRankings({
    days: rankingDays,
  });
  const { data: inactive = [], isLoading: inactiveLoading } =
    useInactiveStudents(inactiveDays);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "income", label: "Ingresos", icon: DollarSign },
    { id: "attendance", label: "Asistencia", icon: BarChart3 },
    { id: "rankings", label: "Rankings", icon: Trophy },
    { id: "inactive", label: "Inactivos", icon: UserX },
  ];

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--tx-primary]">Reportes</h1>
        <p className="mt-1 text-[--tx-muted]">
          Análisis de ingresos, asistencia y comportamiento de alumnos
        </p>
      </div>

      {/* Main tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <TabBtn key={id} active={tab === id} onClick={() => setTab(id)}>
            <Icon className="h-4 w-4" />
            {label}
          </TabBtn>
        ))}
      </div>

      {/* ── Income ──────────────────────────────────────────────────────── */}
      {tab === "income" && (
        <div className="space-y-6">
          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[--tx-muted]" />
              <span className="text-sm text-[--tx-muted]">Período:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-[--bd-default] bg-[--bg-muted] px-3 py-2 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none"
              />
              <span className="text-[--tx-muted]">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-[--bd-default] bg-[--bg-muted] px-3 py-2 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none"
              />
            </div>
          </div>

          {incomeLoading ? (
            <p className="text-center text-[--tx-muted]">Calculando...</p>
          ) : income ? (
            <>
              {/* Totals */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <IncomeCard label="Total del Período" value={formatCurrency(income.grand_total)} accent />
                <IncomeCard label="Efectivo" value={formatCurrency(income.total_cash)} />
                <IncomeCard label="Tarjeta" value={formatCurrency(income.total_card)} />
                <IncomeCard label="Transferencia" value={formatCurrency(income.total_transfer)} />
              </div>

              {/* By type */}
              {Object.keys(income.by_type).length > 0 && (
                <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
                  <h3 className="mb-4 text-base font-semibold text-[--tx-primary]">Por Categoría</h3>
                  <div className="space-y-3">
                    {Object.entries(income.by_type)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([type, amount]) => (
                        <div key={type} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="mb-1 flex justify-between">
                              <span className="text-sm text-[--tx-muted]">{type}</span>
                              <span className="text-sm font-medium text-[--tx-primary]">
                                {formatCurrency(amount as number)}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[--bg-muted]">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  background: "linear-gradient(90deg, var(--gold) 0%, var(--gold-hover) 100%)",
                                  width: `${Math.min(
                                    100,
                                    income.grand_total > 0
                                      ? ((amount as number) / income.grand_total) * 100
                                      : 0
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Daily breakdown */}
              <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
                <div className="border-b border-[--bd-default] px-6 py-4">
                  <h3 className="text-base font-semibold text-[--tx-primary]">Detalle por Día</h3>
                </div>
                <div className="divide-y divide-[--bd-default]">
                  {income.days
                    .filter((d) => d.count > 0)
                    .reverse()
                    .map((day: IncomeDay) => (
                      <div key={day.date} className="flex items-center gap-4 px-6 py-3">
                        <div className="w-28 text-sm text-[--tx-muted]">{formatDate(day.date)}</div>
                        <div className="flex-1 text-xs text-[--tx-disabled]">
                          {day.count} movimiento{day.count !== 1 ? "s" : ""}
                        </div>
                        <span className="text-sm font-semibold text-[--tx-primary]">
                          {formatCurrency(day.total)}
                        </span>
                      </div>
                    ))}
                  {income.days.filter((d) => d.count > 0).length === 0 && (
                    <p className="px-6 py-8 text-center text-sm text-[--tx-muted]">
                      Sin movimientos en el período seleccionado
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Attendance ──────────────────────────────────────────────────── */}
      {tab === "attendance" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <span className="text-sm text-[--tx-muted]">Últimos</span>
            {[7, 14, 30, 90].map((d) => (
              <DayPill
                key={d}
                days={d}
                active={attendanceDays === d}
                onClick={() => setAttendanceDays(d)}
              />
            ))}
          </div>

          {attendanceLoading ? (
            <p className="text-center text-[--tx-muted]">Calculando...</p>
          ) : attendance ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AttStat label="Total Reservas" value={attendance.total} />
              <AttStat label="Asistieron" value={attendance.attended} color="success" />
              <AttStat label="No se presentaron" value={attendance.no_show} color="danger" />
              <AttStat label="Canceladas" value={attendance.cancelled} color="warning" />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Rankings ────────────────────────────────────────────────────── */}
      {tab === "rankings" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <span className="text-sm text-[--tx-muted]">Últimos</span>
            {[7, 14, 30, 90].map((d) => (
              <DayPill
                key={d}
                days={d}
                active={rankingDays === d}
                onClick={() => setRankingDays(d)}
              />
            ))}
          </div>

          {rankingsLoading ? (
            <p className="text-center text-[--tx-muted]">Calculando...</p>
          ) : (
            <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
              <div className="border-b border-[--bd-default] px-6 py-4">
                <h3 className="text-base font-semibold text-[--tx-primary]">
                  Top Alumnos por Check-in
                </h3>
              </div>
              {rankings.length === 0 ? (
                <p className="px-6 py-10 text-center text-[--tx-muted]">
                  Sin check-ins en el período
                </p>
              ) : (
                <div className="divide-y divide-[--bd-default]">
                  {rankings.map((student, idx) => (
                    <div key={student.student_id} className="flex items-center gap-4 px-6 py-4">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={
                          idx === 0
                            ? {
                                background:
                                  "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                                color: "var(--gold-fg)",
                              }
                            : {
                                background: "var(--bg-muted)",
                                color: "var(--tx-disabled)",
                              }
                        }
                      >
                        {idx + 1}
                      </div>
                      <Link
                        to="/students/$studentId"
                        params={{ studentId: student.student_id }}
                        className="flex-1 text-sm font-medium text-[--tx-primary] hover:text-[--gold] transition-colors"
                      >
                        {student.student_name}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-[--gold]" />
                        <span className="text-sm font-semibold text-[--tx-primary]">
                          {student.checkin_count}
                        </span>
                        <span className="text-xs text-[--tx-muted]">check-ins</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Inactive ────────────────────────────────────────────────────── */}
      {tab === "inactive" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <span className="text-sm text-[--tx-muted]">Sin visita en</span>
            {[7, 14, 21, 30].map((d) => (
              <DayPill
                key={d}
                days={d}
                active={inactiveDays === d}
                onClick={() => setInactiveDays(d)}
                prefix="+"
              />
            ))}
          </div>

          {inactiveLoading ? (
            <p className="text-center text-[--tx-muted]">Analizando...</p>
          ) : (
            <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
              <div className="border-b border-[--bd-default] px-6 py-4">
                <h3 className="text-base font-semibold text-[--tx-primary]">
                  Alumnos Inactivos ({inactive.length})
                </h3>
                <p className="text-sm text-[--tx-muted]">
                  Sin check-in en los últimos {inactiveDays} días
                </p>
              </div>
              {inactive.length === 0 ? (
                <p className="px-6 py-10 text-center text-[--tx-muted]">
                  ¡Excelente! Todos los alumnos han visitado recientemente.
                </p>
              ) : (
                <div className="divide-y divide-[--bd-default]">
                  {inactive.map((student) => (
                    <div key={student.student_id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[--gold-bd] bg-[--gold-bg] text-sm font-bold text-[--gold]">
                        {student.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: student.student_id }}
                          className="text-sm font-medium text-[--tx-primary] hover:text-[--gold] transition-colors"
                        >
                          {student.student_name}
                        </Link>
                        <p className="text-xs text-[--tx-muted]">{student.email}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {student.phone && (
                          <a
                            href={`https://wa.me/52${student.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-xl border border-[--color-success-bd] bg-[--color-success-bg] px-3 py-1.5 text-xs font-medium text-[--color-success] hover:opacity-80 transition-opacity"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                        <a
                          href={`mailto:${student.email}`}
                          className="flex items-center gap-1 rounded-xl border border-[--bd-default] px-3 py-1.5 text-xs font-medium text-[--tx-muted] hover:border-[--gold-bd] hover:text-[--gold] transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IncomeCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div
      className="rounded-2xl border p-5"
      style={
        accent
          ? {
              border: "1px solid var(--gold-bd)",
              background: "var(--gold-bg)",
            }
          : {
              border: "1px solid var(--bd-default)",
              background: "var(--bg-surface)",
            }
      }
    >
      <p
        className="text-2xl font-bold"
        style={{ color: accent ? "var(--gold)" : "var(--tx-primary)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-[--tx-muted]">{label}</p>
    </div>
  );
}

function AttStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "success" | "danger" | "warning";
}): React.JSX.Element {
  const borderColor = color ? `var(--color-${color}-bd)` : "var(--bd-default)";
  const bgColor = color ? `var(--color-${color}-bg)` : "var(--bg-surface)";
  const textColor = color ? `var(--color-${color})` : "var(--tx-primary)";
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ border: `1px solid ${borderColor}`, background: bgColor }}
    >
      <p className="text-3xl font-bold" style={{ color: textColor }}>
        {value}
      </p>
      <p className="mt-1 text-sm text-[--tx-muted]">{label}</p>
    </div>
  );
}
