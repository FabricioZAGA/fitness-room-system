import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  CreditCard,
  QrCode,
  Users,
  UserCog,
  Clock,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Trophy,
  DollarSign,
  Banknote,
  CreditCard as CardIcon,
  ArrowLeftRight,
  Flame,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useStats";
import { useRankings } from "@/hooks/useReports";
import { useTodaySummary } from "@/hooks/useTransactions";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function Skeleton({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[--bg-muted] ${className}`}
    />
  );
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "dashboard.greetingMorning";
  if (hour < 18) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

function DashboardPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useDashboardStats();
  const { data: rankings = [], isLoading: rankingsLoading } = useRankings({ limit: 5, days: 30 });
  const { data: todaySummary, isLoading: summaryLoading } = useTodaySummary();

  const todayFormatted = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });

  if (statsError) {
    return (
      <div className="min-h-screen bg-[--bg-base] p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[--tx-primary]">{t("dashboard.welcome")}</h1>
        </div>
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-[--color-danger-bd] p-10 text-center"
          style={{ background: "var(--color-danger-bg)" }}
        >
          <AlertTriangle className="h-10 w-10" style={{ color: "var(--color-danger)" }} />
          <div>
            <h2 className="text-lg font-semibold text-[--tx-primary]">
              No pudimos cargar el dashboard
            </h2>
            <p className="mt-1 text-sm text-[--tx-muted]">
              Revisa tu conexión e intenta de nuevo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void refetchStats(); }}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activeStudents = stats?.active_students ?? 0;
  const todayClasses = stats?.today_classes ?? 0;
  const expiring = stats?.expiring_memberships_7d ?? 0;
  const activeInstructors = stats?.active_instructors ?? 0;
  const upcomingClasses = stats?.upcoming_classes ?? [];
  const expiringMemberships = stats?.expiring_memberships ?? [];

  return (
    <div className="min-h-screen bg-[--bg-base] p-6 lg:p-8">
      {/* ──── Hero Header ──── */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-[--gold]">
            {todayFormatted}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[--tx-primary] lg:text-4xl">
            {t(getGreetingKey())}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-base text-[--tx-muted]">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {/* ──── Quick Actions — pill row ──── */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction to="/checkin" icon={QrCode} label="Check-in" description={t("dashboard.checkinDesc")} primary />
        <QuickAction to="/students" icon={Users} label={t("dashboard.newMember")} description={t("dashboard.newMemberDesc")} />
        <QuickAction to="/classes" icon={Calendar} label={t("dashboard.newClass")} description={t("dashboard.newClassDesc")} />
        <QuickAction to="/memberships" icon={CreditCard} label={t("dashboard.membership")} description={t("dashboard.membershipDesc")} />
      </div>

      {/* ──── Alert: Expiring Memberships ──── */}
      {expiring > 0 && (
        <Link
          to="/memberships"
          className="group mb-8 flex items-center justify-between rounded-2xl border border-[--color-warning-bd] p-5 transition-all hover:border-[--color-warning] hover:shadow-lg"
          style={{ background: "var(--color-warning-bg)" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[--color-warning-bg] ring-1 ring-[--color-warning-bd]">
              <AlertTriangle className="h-5 w-5 text-[--color-warning]" />
            </div>
            <div>
              <p className="font-semibold text-[--color-warning]">
                {t("dashboard.expiringAlert", { count: expiring })}
              </p>
              <p className="text-sm text-[--color-warning]/70">
                {t("dashboard.contactForRenewal")}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[--color-warning] transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      {/* ──── Bento Grid ──── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* ── Stat Cards Row ── */}
        {statsLoading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : (
          <>
            <StatCard
              label={t("dashboard.activeMembers")}
              value={activeStudents}
              icon={Users}
              href="/students"
              accent="gold"
            />
            <StatCard
              label={t("dashboard.classesToday")}
              value={todayClasses}
              icon={Calendar}
              href="/classes"
              accent="info"
            />
            <StatCard
              label={t("dashboard.instructors")}
              value={activeInstructors}
              icon={UserCog}
              href="/instructors"
              accent="success"
            />
            <StatCard
              label={t("dashboard.expiringSoon")}
              value={expiring}
              icon={CreditCard}
              href="/memberships"
              accent="warning"
            />
          </>
        )}

        {/* ── Today's Income (tall card, span 2) ── */}
        <div className="sm:col-span-2 rounded-3xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all hover:border-[--gold-bd]/40">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--gold-bg]">
                <DollarSign className="h-4.5 w-4.5 text-[--gold]" />
              </div>
              <h2 className="text-base font-semibold text-[--tx-primary]">{t("dashboard.todayIncome")}</h2>
            </div>
            <Link to="/caja" className="text-xs font-medium text-[--gold] transition-colors hover:text-[--gold-hover]">
              {t("dashboard.viewCaja")}
            </Link>
          </div>
          {summaryLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : !todaySummary ? (
            <div className="flex flex-col items-center py-10 text-center">
              <DollarSign className="mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-sm text-[--tx-disabled]">{t("dashboard.noMovements")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="relative overflow-hidden rounded-2xl px-6 py-5"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                }}
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/5" />
                <p className="relative text-sm font-medium text-[--gold-fg]/80">{t("dashboard.totalDay")}</p>
                <p className="relative mt-1 text-4xl font-extrabold tracking-tight text-[--gold-fg]">
                  {formatCurrency(todaySummary.grand_total)}
                </p>
                <p className="relative mt-1 text-sm text-[--gold-fg]/60">
                  {todaySummary.transaction_count} {t("dashboard.movements")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("dashboard.cash"), value: todaySummary.total_cash, icon: Banknote },
                  { label: t("dashboard.card"), value: todaySummary.total_card, icon: CardIcon },
                  { label: t("dashboard.transfer"), value: todaySummary.total_transfer, icon: ArrowLeftRight },
                ].map(({ label, value, icon: MIcon }) => (
                  <div key={label} className="rounded-xl border border-[--bd-default] bg-[--bg-muted]/40 p-3 text-center">
                    <MIcon className="mx-auto mb-1.5 h-4 w-4 text-[--tx-disabled]" />
                    <p className="text-base font-bold text-[--tx-primary]">{formatCurrency(value)}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[--tx-disabled]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Top Students (span 2) ── */}
        <div className="sm:col-span-2 rounded-3xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all hover:border-[--gold-bd]/40">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--gold-bg]">
                <Trophy className="h-4.5 w-4.5 text-[--gold]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[--tx-primary]">{t("dashboard.topStudents")}</h2>
                <p className="text-xs text-[--tx-disabled]">{t("dashboard.last30Days")}</p>
              </div>
            </div>
            <Link to="/reportes" className="text-xs font-medium text-[--gold] transition-colors hover:text-[--gold-hover]">
              {t("dashboard.viewReport")}
            </Link>
          </div>
          {rankingsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : rankings.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Trophy className="mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-sm text-[--tx-disabled]">{t("dashboard.noCheckins")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rankings.map((student, idx) => {
                const maxCount = rankings[0]?.checkin_count ?? 1;
                const pct = Math.round((student.checkin_count / maxCount) * 100);
                return (
                  <Link
                    key={student.student_id}
                    to="/students/$studentId"
                    params={{ studentId: student.student_id }}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 transition-colors hover:bg-[--bg-muted]/60"
                  >
                    <div className="absolute inset-y-0 left-0 rounded-xl bg-[--gold-bg]" style={{ width: `${pct}%` }} />
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        idx === 0
                          ? "text-[--gold-fg]"
                          : idx === 1
                            ? "bg-[--bg-muted] text-[--tx-muted]"
                            : "bg-[--bg-muted] text-[--tx-disabled]"
                      }`}
                      style={
                        idx === 0
                          ? { background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)" }
                          : {}
                      }
                    >
                      {idx === 0 ? <Flame className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span className="relative flex-1 truncate text-sm font-medium text-[--tx-primary] group-hover:text-[--gold] transition-colors">
                      {student.student_name}
                    </span>
                    <span className="relative shrink-0 rounded-lg bg-[--gold-bg] px-2.5 py-1 text-xs font-bold text-[--gold]">
                      {student.checkin_count} {t("dashboard.checkins")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Upcoming Classes (span 2) ── */}
        <div className="sm:col-span-2 rounded-3xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all hover:border-[--gold-bd]/40">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--color-info-bg]">
                <Clock className="h-4.5 w-4.5 text-[--color-info]" />
              </div>
              <h2 className="text-base font-semibold text-[--tx-primary]">{t("dashboard.upcomingClasses")}</h2>
            </div>
            <Link to="/classes" className="text-xs font-medium text-[--gold] transition-colors hover:text-[--gold-hover]">
              {t("common.viewAll")}
            </Link>
          </div>
          {statsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : upcomingClasses.length ? (
            <div className="space-y-2">
              {upcomingClasses.map((cls) => {
                const pct = cls.capacity > 0 ? Math.round((cls.reservations_count / cls.capacity) * 100) : 0;
                const isFull = cls.reservations_count >= cls.capacity;
                return (
                  <div
                    key={cls.class_id}
                    className="flex items-center gap-4 rounded-xl border border-[--bd-default] bg-[--bg-muted]/30 p-4 transition-colors hover:border-[--gold-bd]/30"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[--gold-bg]">
                      <span className="text-xs font-bold uppercase leading-none text-[--gold]">
                        {cls.start_time.substring(0, 5)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[--tx-primary] truncate">
                        {CLASS_TYPE_LABELS[cls.class_type] || cls.class_type}
                      </p>
                      <p className="text-sm text-[--tx-muted] truncate">{cls.instructor_name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="w-20">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className={isFull ? "font-bold text-[--color-warning]" : "text-[--tx-muted]"}>
                            {cls.reservations_count}/{cls.capacity}
                          </span>
                          <span className="text-[--tx-disabled]">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[--bg-muted]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: isFull
                                ? "var(--color-warning)"
                                : "linear-gradient(90deg, var(--gold) 0%, var(--gold-hover) 100%)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <Calendar className="mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-sm text-[--tx-disabled]">{t("dashboard.noClasses")}</p>
            </div>
          )}
        </div>

        {/* ── Expiring Memberships (span 2) ── */}
        <div className="sm:col-span-2 rounded-3xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all hover:border-[--gold-bd]/40">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--color-warning-bg]">
                <AlertTriangle className="h-4.5 w-4.5 text-[--color-warning]" />
              </div>
              <h2 className="text-base font-semibold text-[--tx-primary]">{t("dashboard.expiringSoonList")}</h2>
            </div>
            <Link to="/memberships" className="text-xs font-medium text-[--gold] transition-colors hover:text-[--gold-hover]">
              {t("common.viewAll")}
            </Link>
          </div>
          {statsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : expiringMemberships.length > 0 ? (
            <div className="space-y-2">
              {expiringMemberships.slice(0, 5).map((m) => (
                <Link
                  key={m.membership_id}
                  to="/students/$studentId"
                  params={{ studentId: m.student_id }}
                  className="group flex items-center justify-between rounded-xl border border-[--bd-default] bg-[--bg-muted]/30 p-4 transition-colors hover:border-[--color-warning-bd]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold"
                      style={{
                        background: (m.days_until_expiry ?? 99) <= 2
                          ? "var(--color-danger-bg)"
                          : "var(--color-warning-bg)",
                        color: (m.days_until_expiry ?? 99) <= 2
                          ? "var(--color-danger)"
                          : "var(--color-warning)",
                      }}
                    >
                      {m.days_until_expiry}d
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[--tx-primary] truncate group-hover:text-[--gold] transition-colors">
                        {m.student_name || m.student_id.slice(0, 8) + "…"}
                      </p>
                      <p className="text-xs text-[--tx-muted] truncate">
                        {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]} · {formatDate(m.end_date)}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[--tx-disabled] transition-all group-hover:text-[--gold] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <CreditCard className="mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-sm text-[--tx-disabled]">{t("dashboard.noExpiring")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  description,
  primary,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  primary?: boolean;
}): React.JSX.Element {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5 transition-all duration-200 hover:border-[--gold-bd] hover:shadow-lg hover:shadow-[--gold-bg] hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-[--gold-bg] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
        style={{
          background: primary
            ? "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"
            : "var(--gold-bg)",
          color: primary ? "var(--gold-fg)" : "var(--gold)",
          boxShadow: primary ? "0 4px 14px var(--gold-bg)" : "none",
        }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-base font-semibold text-[--tx-primary]">{label}</p>
        <p className="text-sm text-[--tx-muted]">{description}</p>
      </div>
      <ArrowRight className="relative h-4 w-4 shrink-0 text-[--tx-disabled] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[--gold]" />
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = "gold",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent?: "gold" | "info" | "success" | "warning";
}): React.JSX.Element {
  const colorMap = {
    gold: { bg: "var(--gold-bg)", bd: "var(--gold-bd)", fg: "var(--gold)", gradient: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)" },
    info: { bg: "var(--color-info-bg)", bd: "var(--color-info-bd)", fg: "var(--color-info)", gradient: "linear-gradient(135deg, var(--color-info) 0%, #60a5fa 100%)" },
    success: { bg: "var(--color-success-bg)", bd: "var(--color-success-bd)", fg: "var(--color-success)", gradient: "linear-gradient(135deg, var(--color-success) 0%, #4ade80 100%)" },
    warning: { bg: "var(--color-warning-bg)", bd: "var(--color-warning-bd)", fg: "var(--color-warning)", gradient: "linear-gradient(135deg, var(--color-warning) 0%, #fbbf24 100%)" },
  };
  const c = colorMap[accent];
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-3xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all duration-200 hover:border-[--gold-bd] hover:shadow-lg hover:shadow-[--gold-bg] hover:-translate-y-0.5"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 transition-transform duration-300 group-hover:scale-125" style={{ background: c.gradient }} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[--tx-disabled]">{label}</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight" style={{ color: c.fg }}>
            {value}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: c.bg, color: c.fg }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}
