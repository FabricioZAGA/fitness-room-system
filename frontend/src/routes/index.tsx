import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  CreditCard,
  QrCode,
  Users,
  UserCog,
  Clock,
  ArrowRight,
  AlertTriangle,
  Trophy,
  DollarSign,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useStats";
import { useRankings } from "@/hooks/useReports";
import { useTodaySummary } from "@/hooks/useTransactions";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate, formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function Skeleton({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[--bg-muted] ${className}`}
    />
  );
}

function StatCardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-10 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-[--bg-muted]/50 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardPage(): React.JSX.Element {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: rankings = [], isLoading: rankingsLoading } = useRankings({ limit: 5, days: 30 });
  const { data: todaySummary, isLoading: summaryLoading } = useTodaySummary();

  const activeStudents = stats?.active_students ?? 0;
  const todayClasses = stats?.today_classes ?? 0;
  const expiring = stats?.expiring_memberships_7d ?? 0;
  const activeInstructors = stats?.active_instructors ?? 0;
  const upcomingClasses = stats?.upcoming_classes ?? [];
  const expiringMemberships = stats?.expiring_memberships ?? [];

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--tx-primary]">¡Bienvenido!</h1>
        <p className="mt-1 text-[--tx-muted]">Resumen de hoy en Fitness Room</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          to="/checkin"
          icon={QrCode}
          label="Check-in"
          description="Registrar entrada"
          primary
        />
        <QuickAction
          to="/students"
          icon={Users}
          label="Nuevo Miembro"
          description="Registrar alumno"
        />
        <QuickAction
          to="/classes"
          icon={Calendar}
          label="Nueva Clase"
          description="Programar clase"
        />
        <QuickAction
          to="/memberships"
          icon={CreditCard}
          label="Membresía"
          description="Asignar plan"
        />
      </div>

      {/* Alert: Expiring Memberships */}
      {expiring > 0 && (
        <Link
          to="/memberships"
          className="mb-8 flex items-center justify-between rounded-2xl border-2 border-[--color-warning-bd] bg-[--color-warning-bg] p-5 transition-all hover:border-[--color-warning]"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-[--color-warning-bg] p-3">
              <AlertTriangle className="h-6 w-6 text-[--color-warning]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[--color-warning]">
                {expiring} membresía{expiring !== 1 ? "s" : ""} por vencer
              </p>
              <p className="text-sm text-[--color-warning]/70">
                Contactar miembros para renovación
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[--color-warning]" />
        </Link>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Miembros Activos" value={activeStudents} icon={Users} href="/students" />
            <StatCard label="Clases Hoy" value={todayClasses} icon={Calendar} href="/classes" />
            <StatCard label="Instructores" value={activeInstructors} icon={UserCog} href="/instructors" />
            <StatCard label="Por Vencer" value={expiring} icon={CreditCard} warning href="/memberships" />
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[--tx-primary]">Próximas Clases</h2>
            <Link
              to="/classes"
              className="text-sm text-[--gold] transition-colors hover:text-[--gold-hover]"
            >
              Ver todas →
            </Link>
          </div>
          {statsLoading ? (
            <ListSkeleton rows={3} />
          ) : upcomingClasses.length ? (
            <div className="space-y-2">
              {upcomingClasses.map((cls) => (
                <div
                  key={cls.class_id}
                  className="flex items-center gap-4 rounded-xl bg-[--bg-muted]/50 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg]">
                    <Clock className="h-5 w-5 text-[--gold]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[--tx-primary] truncate">
                      {CLASS_TYPE_LABELS[cls.class_type] || cls.class_type}
                    </p>
                    <p className="text-sm text-[--tx-muted] truncate">
                      {cls.instructor_name} · {cls.start_time.substring(0, 5)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-[--gold]">
                      {cls.reservations_count}/{cls.capacity}
                    </p>
                    <p className="text-xs text-[--tx-disabled]">reservados</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[--bg-muted]/30 py-12 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-[--tx-disabled]">No hay clases programadas</p>
            </div>
          )}
        </div>

        {/* Expiring Soon List */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[--tx-primary]">Membresías por Vencer</h2>
            <Link
              to="/memberships"
              className="text-sm text-[--gold] transition-colors hover:text-[--gold-hover]"
            >
              Ver todas →
            </Link>
          </div>
          {statsLoading ? (
            <ListSkeleton rows={3} />
          ) : expiringMemberships.length > 0 ? (
            <div className="space-y-2">
              {expiringMemberships.slice(0, 5).map((m) => (
                <div
                  key={m.membership_id}
                  className="flex items-center justify-between rounded-xl bg-[--bg-muted]/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--color-warning-bg] text-sm font-bold text-[--color-warning]">
                      {m.days_until_expiry}d
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[--tx-primary] truncate">
                        {m.student_name || m.student_id.slice(0, 8) + "…"}
                      </p>
                      <p className="text-sm text-[--tx-muted] truncate">
                        {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]} · {formatDate(m.end_date)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: m.student_id }}
                    className="ml-3 shrink-0 text-xs text-[--gold] transition-colors hover:text-[--gold-hover]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[--bg-muted]/30 py-12 text-center">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-[--tx-disabled]">No hay membresías por vencer</p>
            </div>
          )}
        </div>
      </div>

      {/* Rankings + Today's Income */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top Students Ranking */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[--gold]" />
              <h2 className="text-lg font-semibold text-[--tx-primary]">Top Alumnos</h2>
            </div>
            <Link
              to="/reportes"
              className="text-sm text-[--gold] transition-colors hover:text-[--gold-hover]"
            >
              Ver reporte →
            </Link>
          </div>
          {rankingsLoading ? (
            <ListSkeleton rows={3} />
          ) : rankings.length === 0 ? (
            <div className="rounded-xl bg-[--bg-muted]/30 py-10 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-sm text-[--tx-disabled]">Sin check-ins este mes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rankings.map((student, idx) => (
                <div
                  key={student.student_id}
                  className="flex items-center gap-3 rounded-xl bg-[--bg-muted]/50 px-4 py-3"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? "text-[--gold-fg]" : "bg-[--bg-muted] text-[--tx-disabled]"
                    }`}
                    style={
                      idx === 0
                        ? {
                            background:
                              "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                          }
                        : {}
                    }
                  >
                    {idx + 1}
                  </div>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: student.student_id }}
                    className="flex-1 truncate text-sm font-medium text-[--tx-primary] hover:text-[--gold] transition-colors"
                  >
                    {student.student_name}
                  </Link>
                  <span className="shrink-0 text-sm font-bold text-[--gold]">
                    {student.checkin_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Income */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[--gold]" />
              <h2 className="text-lg font-semibold text-[--tx-primary]">Ingresos de Hoy</h2>
            </div>
            <Link
              to="/caja"
              className="text-sm text-[--gold] transition-colors hover:text-[--gold-hover]"
            >
              Ver caja →
            </Link>
          </div>
          {summaryLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          ) : !todaySummary ? (
            <div className="rounded-xl bg-[--bg-muted]/30 py-10 text-center">
              <DollarSign className="mx-auto mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-sm text-[--tx-disabled]">Sin movimientos hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-5 py-4">
                <p className="text-sm text-[--tx-muted]">Total del día</p>
                <p className="text-3xl font-bold text-[--gold]">
                  {formatCurrency(todaySummary.grand_total)}
                </p>
                <p className="mt-1 text-xs text-[--tx-muted]">
                  {todaySummary.transaction_count} movimiento
                  {todaySummary.transaction_count !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Efectivo", value: todaySummary.total_cash },
                  { label: "Tarjeta", value: todaySummary.total_card },
                  { label: "Transfer.", value: todaySummary.total_transfer },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[--bg-muted]/50 px-3 py-3 text-center"
                  >
                    <p className="text-sm font-semibold text-[--tx-primary]">
                      {formatCurrency(value)}
                    </p>
                    <p className="mt-0.5 text-xs text-[--tx-muted]">{label}</p>
                  </div>
                ))}
              </div>
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
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5 transition-all hover:border-[--gold-bd] hover:shadow-lg"
    >
      {/* Subtle gold wash on hover */}
      <div className="absolute inset-0 bg-[--gold-bg] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* Icon */}
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: primary ? "var(--gold)" : "var(--gold-bg)",
          color: primary ? "var(--gold-fg)" : "var(--gold)",
        }}
      >
        <Icon className="h-6 w-6" />
      </div>

      {/* Text */}
      <div className="relative min-w-0 flex-1">
        <p className="text-base font-semibold text-[--tx-primary]">{label}</p>
        <p className="text-sm text-[--tx-muted]">{description}</p>
      </div>

      {/* Arrow */}
      <ArrowRight className="relative h-4 w-4 shrink-0 text-[--tx-disabled] transition-all group-hover:translate-x-0.5 group-hover:text-[--gold]" />
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  warning,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  warning?: boolean;
  href: string;
}): React.JSX.Element {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all hover:border-[--gold-bd]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[--tx-muted]">{label}</p>
          <p
            className={`mt-2 text-4xl font-bold ${
              warning ? "text-[--color-warning]" : "text-[--tx-primary]"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{
            backgroundColor: warning ? "var(--color-warning-bg)" : "var(--gold-bg)",
            color: warning ? "var(--color-warning)" : "var(--gold)",
          }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}
