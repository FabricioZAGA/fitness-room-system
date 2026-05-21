import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  TrendingUp,
  Trophy,
  UserX,
  DollarSign,
  CalendarDays,
  Mail,
  Phone,
  FileSpreadsheet,
  FileText,
  Tag,
} from "lucide-react";
import {
  useIncomeReport,
  useAttendanceSummary,
  useRankings,
  useInactiveStudents,
  useMembershipsRange,
} from "@/hooks/useReports";
import { reportService } from "@/services/reportService";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { IncomeDay } from "@/types/report";
import { useGymStore } from "@/store/useGymStore";
import { useSendCustomNotification } from "@/hooks/useNotifications";
import {
  rangeForPreset,
  detectPreset,
  type RangePreset,
} from "@/lib/dateRangePresets";

// exportReports is loaded lazily so xlsx/jspdf/html2canvas stay out of the main chunk
const loadExportReports = (): Promise<typeof import("@/lib/exportReports")> =>
  import("@/lib/exportReports");

export const Route = createFileRoute("/reportes/")({
  component: ReportesPage,
});

type Tab = "income" | "memberships" | "attendance" | "rankings" | "inactive";

const goldActiveStyle = {
  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
  color: "var(--gold-fg)",
  border: "1px solid transparent",
} as const;

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
      {prefix}
      {days} días
    </button>
  );
}

function PresetPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
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
      {label}
    </button>
  );
}

/** Reusable date-range filter row with quick presets + start/end pickers. */
function DateRangeFilter({
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const activePreset = detectPreset({ start, end });

  function applyPreset(preset: RangePreset): void {
    if (preset === "custom") return;
    const range = rangeForPreset(preset, { start, end });
    onStartChange(range.start);
    onEndChange(range.end);
  }

  const presets: { id: RangePreset; label: string }[] = [
    { id: "today", label: t("reportes.rangeToday") },
    { id: "yesterday", label: t("reportes.rangeYesterday") },
    { id: "thisWeek", label: t("reportes.rangeThisWeek") },
    { id: "thisMonth", label: t("reportes.rangeThisMonth") },
    { id: "lastMonth", label: t("reportes.rangeLastMonth") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => (
          <PresetPill
            key={p.id}
            label={p.label}
            active={activePreset === p.id}
            onClick={() => applyPreset(p.id)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[--tx-muted]" />
        <input
          type="date"
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          className="rounded-xl border border-[--bd-default] bg-[--bg-muted] px-3 py-2 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none"
        />
        <span className="text-[--tx-muted]">—</span>
        <input
          type="date"
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          className="rounded-xl border border-[--bd-default] bg-[--bg-muted] px-3 py-2 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none"
        />
      </div>
    </div>
  );
}

function ReportesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("income");

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
  const todayParts = todayStr.split("-");
  const firstOfMonth = `${todayParts[0]}-${todayParts[1]}-01`;

  const defaultInactiveDays = useGymStore((s) => s.inactiveDays);
  const gymName = useGymStore((s) => s.name);
  const notifyMutation = useSendCustomNotification();

  // Each tab has its own date state to avoid surprising cross-tab jumps.
  const [incomeStart, setIncomeStart] = useState(firstOfMonth);
  const [incomeEnd, setIncomeEnd] = useState(todayStr);
  const [membershipStart, setMembershipStart] = useState(firstOfMonth);
  const [membershipEnd, setMembershipEnd] = useState(todayStr);
  const [attendanceMode, setAttendanceMode] = useState<"days" | "range">("days");
  const [attendanceDays, setAttendanceDays] = useState(30);
  const [attendanceStart, setAttendanceStart] = useState(firstOfMonth);
  const [attendanceEnd, setAttendanceEnd] = useState(todayStr);
  const [rankingMode, setRankingMode] = useState<"days" | "range">("days");
  const [rankingDays, setRankingDays] = useState(30);
  const [rankingStart, setRankingStart] = useState(firstOfMonth);
  const [rankingEnd, setRankingEnd] = useState(todayStr);
  const [inactiveDays, setInactiveDays] = useState(defaultInactiveDays);

  const incomePeriodLabel = `${incomeStart} al ${incomeEnd}`;
  const membershipPeriodLabel = `${membershipStart} al ${membershipEnd}`;

  const { data: income, isLoading: incomeLoading } = useIncomeReport({
    start_date: incomeStart,
    end_date: incomeEnd,
  });
  const { data: memberships, isLoading: membershipsLoading } = useMembershipsRange({
    start_date: membershipStart,
    end_date: membershipEnd,
  });
  const attendanceParams = useMemo(
    () =>
      attendanceMode === "range"
        ? { start_date: attendanceStart, end_date: attendanceEnd }
        : { days: attendanceDays },
    [attendanceMode, attendanceStart, attendanceEnd, attendanceDays],
  );
  const { data: attendance, isLoading: attendanceLoading } =
    useAttendanceSummary(attendanceParams);
  const rankingParams = useMemo(
    () =>
      rankingMode === "range"
        ? { start_date: rankingStart, end_date: rankingEnd }
        : { days: rankingDays },
    [rankingMode, rankingStart, rankingEnd, rankingDays],
  );
  const { data: rankings = [], isLoading: rankingsLoading } = useRankings(rankingParams);
  const { data: inactive = [], isLoading: inactiveLoading } =
    useInactiveStudents(inactiveDays);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "income", label: t("reportes.income"), icon: DollarSign },
    { id: "memberships", label: t("reportes.memberships"), icon: Tag },
    { id: "attendance", label: t("reportes.attendance"), icon: BarChart3 },
    { id: "rankings", label: t("reportes.rankings"), icon: Trophy },
    { id: "inactive", label: t("reportes.inactive"), icon: UserX },
  ];

  const attendancePeriodLabel = attendance?.period_label ?? `últimos ${attendanceDays} días`;
  const rankingPeriodLabel =
    rankingMode === "range"
      ? `${rankingStart} al ${rankingEnd}`
      : `últimos ${rankingDays} días`;

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--tx-primary]">{t("reportes.title")}</h1>
        <p className="mt-1 text-[--tx-muted]">{t("reportes.subtitle")}</p>
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
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <DateRangeFilter
              start={incomeStart}
              end={incomeEnd}
              onStartChange={setIncomeStart}
              onEndChange={setIncomeEnd}
            />
            {income && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    // Fetch the same range with transactions included for the Excel detail sheet
                    const full = await reportService.incomeReport({
                      start_date: incomeStart,
                      end_date: incomeEnd,
                      include_transactions: true,
                    });
                    m.exportIncomeExcel(full, incomePeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-success-bd] hover:text-[--color-success]"
                  title={t("reportes.includeTransactionsHelp")}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    const full = await reportService.incomeReport({
                      start_date: incomeStart,
                      end_date: incomeEnd,
                      include_transactions: true,
                    });
                    m.exportIncomePDF(full, incomePeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-danger-bd] hover:text-[--color-danger]"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {incomeLoading ? (
            <p className="text-center text-[--tx-muted]">{t("reportes.calculating")}</p>
          ) : income ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <IncomeCard label={t("reportes.totalPeriod")} value={formatCurrency(income.grand_total)} accent />
                <IncomeCard label={t("dashboard.cash")} value={formatCurrency(income.total_cash)} />
                <IncomeCard label={t("dashboard.card")} value={formatCurrency(income.total_card)} />
                <IncomeCard label={t("caja.transfer")} value={formatCurrency(income.total_transfer)} />
              </div>

              {Object.keys(income.by_type).length > 0 && (
                <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
                  <h3 className="mb-4 text-base font-semibold text-[--tx-primary]">{t("reportes.byCategory")}</h3>
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
                                  background:
                                    "linear-gradient(90deg, var(--gold) 0%, var(--gold-hover) 100%)",
                                  width: `${Math.min(
                                    100,
                                    income.grand_total > 0
                                      ? ((amount as number) / income.grand_total) * 100
                                      : 0,
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

              {/* Daily breakdown — now with cash/card/transfer columns */}
              <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
                <div className="border-b border-[--bd-default] px-6 py-4">
                  <h3 className="text-base font-semibold text-[--tx-primary]">{t("reportes.dailyDetail")}</h3>
                </div>
                <div className="hidden grid-cols-12 gap-3 border-b border-[--bd-default] px-6 py-2 text-xs uppercase tracking-wide text-[--tx-disabled] sm:grid">
                  <div className="col-span-3">Fecha</div>
                  <div className="col-span-2">Mov.</div>
                  <div className="col-span-2 text-right">Efectivo</div>
                  <div className="col-span-2 text-right">Tarjeta</div>
                  <div className="col-span-1 text-right">Transf.</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                <div className="divide-y divide-[--bd-default]">
                  {income.days
                    .filter((d) => d.count > 0)
                    .reverse()
                    .map((day: IncomeDay) => (
                      <div
                        key={day.date}
                        className="grid grid-cols-1 gap-2 px-6 py-3 sm:grid-cols-12 sm:items-center sm:gap-3"
                      >
                        <div className="col-span-3 text-sm text-[--tx-primary]">{formatDate(day.date)}</div>
                        <div className="col-span-2 text-xs text-[--tx-disabled]">
                          {day.count} mov.
                        </div>
                        <div className="col-span-2 text-right text-sm text-[--tx-muted]">
                          {formatCurrency(day.cash)}
                        </div>
                        <div className="col-span-2 text-right text-sm text-[--tx-muted]">
                          {formatCurrency(day.card)}
                        </div>
                        <div className="col-span-1 text-right text-sm text-[--tx-muted]">
                          {formatCurrency(day.transfer)}
                        </div>
                        <div className="col-span-2 text-right text-sm font-semibold text-[--tx-primary]">
                          {formatCurrency(day.total)}
                        </div>
                      </div>
                    ))}
                  {income.days.filter((d) => d.count > 0).length === 0 && (
                    <p className="px-6 py-8 text-center text-sm text-[--tx-muted]">
                      {t("reportes.noMovements")}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Memberships by range ────────────────────────────────────────── */}
      {tab === "memberships" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <DateRangeFilter
              start={membershipStart}
              end={membershipEnd}
              onStartChange={setMembershipStart}
              onEndChange={setMembershipEnd}
            />
            {memberships && memberships.count > 0 && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportMembershipsRangeExcel(memberships, membershipPeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-success-bd] hover:text-[--color-success]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportMembershipsRangePDF(memberships, membershipPeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-danger-bd] hover:text-[--color-danger]"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {membershipsLoading ? (
            <p className="text-center text-[--tx-muted]">{t("reportes.calculating")}</p>
          ) : memberships ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <IncomeCard
                  label={t("reportes.membershipsCount", { count: memberships.count })}
                  value={String(memberships.count)}
                  accent
                />
                <IncomeCard
                  label={t("reportes.estimatedRevenue")}
                  value={formatCurrency(memberships.total_revenue)}
                />
              </div>

              <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
                <div className="border-b border-[--bd-default] px-6 py-4">
                  <h3 className="text-base font-semibold text-[--tx-primary]">
                    {t("reportes.dailyDetail")}
                  </h3>
                </div>
                {memberships.memberships.length === 0 ? (
                  <p className="px-6 py-10 text-center text-[--tx-muted]">
                    {t("reportes.noMemberships")}
                  </p>
                ) : (
                  <div className="divide-y divide-[--bd-default]">
                    {memberships.memberships.map((m) => (
                      <div key={m.membership_id} className="flex flex-wrap items-center gap-4 px-6 py-3">
                        <div className="w-28 text-sm text-[--tx-muted]">{m.start_date}</div>
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: m.student_id }}
                          className="min-w-[160px] flex-1 text-sm font-medium text-[--tx-primary] hover:text-[--gold] transition-colors"
                        >
                          {m.student_name || "—"}
                        </Link>
                        <div className="w-32 text-sm text-[--tx-muted]">{m.membership_type}</div>
                        <div className="w-20 text-right text-sm font-semibold text-[--tx-primary]">
                          {formatCurrency(m.price)}
                        </div>
                        <div className="w-24 text-xs text-[--tx-disabled]">{m.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Attendance ──────────────────────────────────────────────────── */}
      {tab === "attendance" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <span className="text-sm text-[--tx-muted]">{t("reportes.last")}</span>
            {[7, 14, 30, 90].map((d) => (
              <DayPill
                key={d}
                days={d}
                active={attendanceMode === "days" && attendanceDays === d}
                onClick={() => {
                  setAttendanceMode("days");
                  setAttendanceDays(d);
                }}
              />
            ))}
            <PresetPill
              label={t("reportes.rangeCustom")}
              active={attendanceMode === "range"}
              onClick={() => setAttendanceMode("range")}
            />
            {attendanceMode === "range" && (
              <DateRangeFilter
                start={attendanceStart}
                end={attendanceEnd}
                onStartChange={setAttendanceStart}
                onEndChange={setAttendanceEnd}
              />
            )}
            {attendance && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportAttendanceExcel(attendance, attendancePeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-success-bd] hover:text-[--color-success]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportAttendancePDF(attendance, attendancePeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-danger-bd] hover:text-[--color-danger]"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {attendanceLoading ? (
            <p className="text-center text-[--tx-muted]">{t("reportes.calculating")}</p>
          ) : attendance ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AttStat label={t("reportes.totalReservations")} value={attendance.total} />
              <AttStat label={t("reportes.attended")} value={attendance.attended} color="success" />
              <AttStat label={t("reportes.noShow")} value={attendance.no_show} color="danger" />
              <AttStat label={t("reportes.cancelled")} value={attendance.cancelled} color="warning" />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Rankings ────────────────────────────────────────────────────── */}
      {tab === "rankings" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-4">
            <span className="text-sm text-[--tx-muted]">{t("reportes.last")}</span>
            {[7, 14, 30, 90].map((d) => (
              <DayPill
                key={d}
                days={d}
                active={rankingMode === "days" && rankingDays === d}
                onClick={() => {
                  setRankingMode("days");
                  setRankingDays(d);
                }}
              />
            ))}
            <PresetPill
              label={t("reportes.rangeCustom")}
              active={rankingMode === "range"}
              onClick={() => setRankingMode("range")}
            />
            {rankingMode === "range" && (
              <DateRangeFilter
                start={rankingStart}
                end={rankingEnd}
                onStartChange={setRankingStart}
                onEndChange={setRankingEnd}
              />
            )}
            {rankings.length > 0 && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportRankingsExcel(rankings, rankingPeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-success-bd] hover:text-[--color-success]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportRankingsPDF(rankings, rankingPeriodLabel, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-danger-bd] hover:text-[--color-danger]"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {rankingsLoading ? (
            <p className="text-center text-[--tx-muted]">{t("reportes.calculating")}</p>
          ) : (
            <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
              <div className="border-b border-[--bd-default] px-6 py-4">
                <h3 className="text-base font-semibold text-[--tx-primary]">
                  {t("reportes.topByCheckin")}
                </h3>
              </div>
              {rankings.length === 0 ? (
                <p className="px-6 py-10 text-center text-[--tx-muted]">
                  {t("reportes.noCheckins")}
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
                        <span className="text-xs text-[--tx-muted]">{t("reportes.checkinsLabel")}</span>
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
            <span className="text-sm text-[--tx-muted]">{t("reportes.noVisitSince")}</span>
            {[7, 14, 21, 30].map((d) => (
              <DayPill
                key={d}
                days={d}
                active={inactiveDays === d}
                onClick={() => setInactiveDays(d)}
                prefix="+"
              />
            ))}
            {inactive.length > 0 && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportInactiveExcel(inactive, inactiveDays, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-success-bd] hover:text-[--color-success]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={async () => {
                    const m = await loadExportReports();
                    m.exportInactivePDF(inactive, inactiveDays, gymName);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--color-danger-bd] hover:text-[--color-danger]"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            )}
          </div>

          {inactiveLoading ? (
            <p className="text-center text-[--tx-muted]">{t("reportes.analyzing")}</p>
          ) : (
            <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface]">
              <div className="border-b border-[--bd-default] px-6 py-4">
                <h3 className="text-base font-semibold text-[--tx-primary]">
                  {t("reportes.inactiveStudents", { count: inactive.length })}
                </h3>
                <p className="text-sm text-[--tx-muted]">
                  {t("reportes.noVisitIn", { days: inactiveDays })}
                </p>
              </div>
              {inactive.length === 0 ? (
                <p className="px-6 py-10 text-center text-[--tx-muted]">
                  {t("reportes.allActive")}
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
                        <p className="text-xs text-[--tx-disabled]">
                          {t("reportes.lastCheckin")}:{" "}
                          {student.last_checkin ?? t("reportes.neverCheckedIn")}
                        </p>
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
                        <button
                          onClick={() =>
                            notifyMutation.mutate({
                              studentId: student.student_id,
                              data: {
                                subject: `¡Te extrañamos en Fitness Room!`,
                                message: `Hola ${student.student_name}, han pasado más de ${inactiveDays} días desde tu última visita. Te esperamos para seguir entrenando juntos. ¡Tu progreso te espera!`,
                              },
                            })
                          }
                          disabled={notifyMutation.isPending}
                          className="flex items-center gap-1 rounded-xl border border-[--bd-default] px-3 py-1.5 text-xs font-medium text-[--tx-muted] hover:border-[--gold-bd] hover:text-[--gold] transition-colors disabled:opacity-50"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </button>
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
