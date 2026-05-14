import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CreditCard,
  Plus,
  Calendar,
  DollarSign,
  Mail,
  CheckCircle2,
  Snowflake,
  XCircle,
  Search,
  TrendingUp,
} from "lucide-react";
import { useAllMemberships } from "@/hooks/useMemberships";
import { useStudents } from "@/hooks/useStudents";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { useSendCustomNotification } from "@/hooks/useNotifications";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import type { Membership, MembershipStatus } from "@/types/membership";
import { formatDate, formatCurrency, getInitials, todayMX } from "@/lib/utils";

export const Route = createFileRoute("/memberships/")({
  component: MembershipsPage,
});

type Tab = "active" | "expiring" | "expired" | "frozen" | "cancelled" | "all";

function MembershipsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [renewStudentId, setRenewStudentId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");

  const { data: allData, isLoading } = useAllMemberships({ limit: 500 });
  const { data: studentsData } = useStudents({ limit: 500 });
  const notifyMutation = useSendCustomNotification();

  const allMemberships: Membership[] = useMemo(() => allData?.items ?? [], [allData]);

  const studentMap = useMemo(() => {
    const map: Record<string, { name: string; photo_url: string | null }> = {};
    for (const s of studentsData?.items ?? [])
      map[s.student_id] = { name: s.full_name, photo_url: s.photo_url };
    return map;
  }, [studentsData]);

  // ── Buckets ─────────────────────────────────────────────────────────────
  const today = todayMX();

  const buckets = useMemo(() => {
    const active: Membership[] = [];
    const expiring: Membership[] = []; // active + ≤30 días
    const expired: Membership[] = [];
    const frozen: Membership[] = [];
    const cancelled: Membership[] = [];

    for (const m of allMemberships) {
      if (m.status === "frozen") {
        frozen.push(m);
      } else if (m.status === "cancelled") {
        cancelled.push(m);
      } else if (m.status === "expired" || m.end_date < today) {
        expired.push(m);
      } else if (m.status === "active") {
        active.push(m);
        const days = m.days_until_expiry ?? 999;
        if (days <= 30) expiring.push(m);
      }
    }

    // Sort each bucket meaningfully
    active.sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0));
    expiring.sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0));
    expired.sort((a, b) => b.end_date.localeCompare(a.end_date));
    frozen.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    cancelled.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    return { active, expiring, expired, frozen, cancelled };
  }, [allMemberships, today]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const expiringWeek = buckets.expiring.filter(
      (m) => (m.days_until_expiry ?? 999) <= 7,
    ).length;

    // Revenue this month — sum price_paid of memberships started within the
    // current month (Mexico City timezone). This is a real, useful number.
    const yearMonth = today.slice(0, 7); // YYYY-MM
    const monthRevenue = allMemberships
      .filter((m) => m.start_date.startsWith(yearMonth))
      .reduce((sum, m) => sum + (m.price_paid ?? 0), 0);

    return {
      activeCount: buckets.active.length,
      expiringWeek,
      expiringIn30: buckets.expiring.length,
      expired: buckets.expired.length,
      frozen: buckets.frozen.length,
      monthRevenue,
    };
  }, [buckets, allMemberships, today]);

  // ── Filter by tab + search ──────────────────────────────────────────────
  const visible = useMemo(() => {
    let list: Membership[];
    switch (tab) {
      case "active":
        list = buckets.active;
        break;
      case "expiring":
        list = buckets.expiring;
        break;
      case "expired":
        list = buckets.expired;
        break;
      case "frozen":
        list = buckets.frozen;
        break;
      case "cancelled":
        list = buckets.cancelled;
        break;
      case "all":
      default:
        list = allMemberships;
        break;
    }
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((m) => {
      const name = studentMap[m.student_id]?.name?.toLowerCase() ?? "";
      return name.includes(q);
    });
  }, [tab, buckets, allMemberships, search, studentMap]);

  return (
    <>
      <div className="min-h-screen bg-[--bg-base] p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[--tx-primary]">{t("memberships.title")}</h1>
            <p className="mt-1 text-lg text-[--tx-muted]">{t("memberships.alertsDesc")}</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 25px var(--gold-bg)",
            }}
          >
            <Plus className="h-5 w-5" />
            {t("memberships.newMembership")}
          </button>
        </div>

        {/* KPI cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={CheckCircle2}
            label={t("memberships.totalActive")}
            value={stats.activeCount}
            color="success"
          />
          <KpiCard
            icon={AlertTriangle}
            label={t("memberships.expireThisWeek")}
            value={stats.expiringWeek}
            color={stats.expiringWeek > 0 ? "danger" : "muted"}
          />
          <KpiCard
            icon={CreditCard}
            label={t("memberships.expireIn30")}
            value={stats.expiringIn30}
            color={stats.expiringIn30 > 0 ? "warning" : "muted"}
          />
          <KpiCard
            icon={TrendingUp}
            label={t("memberships.monthlyRevenue")}
            value={formatCurrency(stats.monthRevenue)}
            color="info"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <TabButton
            active={tab === "active"}
            onClick={() => setTab("active")}
            label={`${t("memberships.tabActive")} (${stats.activeCount})`}
          />
          <TabButton
            active={tab === "expiring"}
            onClick={() => setTab("expiring")}
            label={`${t("memberships.tabExpiringSoon")} (${stats.expiringIn30})`}
            tone={stats.expiringWeek > 0 ? "danger" : undefined}
          />
          <TabButton
            active={tab === "expired"}
            onClick={() => setTab("expired")}
            label={`${t("memberships.tabExpired")} (${stats.expired})`}
            tone={stats.expired > 0 ? "warning" : undefined}
          />
          <TabButton
            active={tab === "frozen"}
            onClick={() => setTab("frozen")}
            label={`${t("memberships.tabFrozen")} (${stats.frozen})`}
          />
          <TabButton
            active={tab === "cancelled"}
            onClick={() => setTab("cancelled")}
            label={`${t("memberships.tabCancelled")} (${buckets.cancelled.length})`}
          />
          <TabButton
            active={tab === "all"}
            onClick={() => setTab("all")}
            label={`${t("memberships.tabAll")} (${allMemberships.length})`}
          />
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-surface] px-4 py-2.5">
          <Search className="h-4 w-4 text-[--tx-disabled]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("memberships.searchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:outline-none"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] py-20 text-center">
            <CreditCard className="mx-auto mb-4 h-16 w-16 text-[--tx-disabled]" />
            <p className="text-xl text-[--tx-muted]">{t("memberships.noMatching")}</p>
            {tab === "expiring" && (
              <p className="mt-2 text-[--tx-disabled]">{t("memberships.allUpToDate")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((m) => (
              <MembershipCard
                key={m.membership_id}
                membership={m}
                today={today}
                student={studentMap[m.student_id]}
                onRenew={
                  m.status === "expired" ||
                  (m.status === "active" && (m.days_until_expiry ?? 999) <= 30)
                    ? () => setRenewStudentId(m.student_id)
                    : undefined
                }
                onNotify={
                  m.status === "active" && (m.days_until_expiry ?? 999) <= 30
                    ? () =>
                        notifyMutation.mutate({
                          studentId: m.student_id,
                          data: {
                            subject: `Recordatorio: tu membresía vence en ${m.days_until_expiry ?? 0} días`,
                            message: `Hola, te recordamos que tu membresía vence el ${m.end_date}. Visítanos para renovarla y seguir entrenando sin interrupciones.`,
                          },
                        })
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      <CreateMembershipModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {renewStudentId && (
        <CreateMembershipModal
          open={!!renewStudentId}
          onClose={() => setRenewStudentId(null)}
          studentId={renewStudentId}
        />
      )}
    </>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: "success" | "warning" | "danger" | "info" | "muted";
}): React.JSX.Element {
  const colorMap = {
    success: {
      bg: "bg-[--color-success-bg]",
      bd: "border-[--color-success-bd]",
      text: "text-[--color-success]",
    },
    warning: {
      bg: "bg-[--color-warning-bg]",
      bd: "border-[--color-warning-bd]",
      text: "text-[--color-warning]",
    },
    danger: {
      bg: "bg-[--color-danger-bg]",
      bd: "border-[--color-danger-bd]",
      text: "text-[--color-danger]",
    },
    info: {
      bg: "bg-[--color-info-bg]",
      bd: "border-[--color-info-bd]",
      text: "text-[--color-info]",
    },
    muted: {
      bg: "bg-[--bg-muted]",
      bd: "border-[--bd-default]",
      text: "text-[--tx-muted]",
    },
  }[color];

  return (
    <div className={`rounded-2xl border ${colorMap.bd} ${colorMap.bg} p-5`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl ${colorMap.bg} p-3`}>
          <Icon className={`h-6 w-6 ${colorMap.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-bold text-[--tx-primary]">{value}</p>
          <p className={`truncate text-sm ${colorMap.text}`}>{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "danger" | "warning";
}): React.JSX.Element {
  const baseStyle = active
    ? {
        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
        color: "var(--gold-fg)",
        border: "1px solid transparent",
      }
    : {
        background: "var(--bg-surface)",
        color: "var(--tx-muted)",
        border: "1px solid var(--bd-default)",
      };
  const dotColor = tone === "danger" ? "var(--color-danger)" : tone === "warning" ? "var(--color-warning)" : null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
      style={baseStyle}
    >
      {dotColor && !active && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {label}
    </button>
  );
}

// ─── Membership Card ─────────────────────────────────────────────────────────

function MembershipCard({
  membership: m,
  today,
  student,
  onRenew,
  onNotify,
}: {
  membership: Membership;
  today: string;
  student?: { name: string; photo_url: string | null };
  onRenew?: () => void;
  onNotify?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  // Compute effective state — even if backend says "active", check date
  const isExpiredByDate = m.status === "active" && m.end_date < today;
  const effectiveStatus: MembershipStatus = isExpiredByDate ? "expired" : m.status;
  const days = m.days_until_expiry ?? 0;

  const tone = getStatusTone(effectiveStatus, days);

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border bg-[--bg-surface] p-5 transition-all sm:flex-row sm:items-center sm:justify-between ${tone.borderClass} hover:${tone.hoverBorderClass}`}
    >
      <div className="flex flex-1 items-center gap-4">
        {/* Status indicator */}
        <div
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border ${tone.badgeClass}`}
        >
          {effectiveStatus === "active" ? (
            <>
              <p className={`text-xl font-bold ${tone.textClass}`}>{days}</p>
              <p className="text-[10px] uppercase tracking-wide text-[--tx-disabled]">
                {t("memberships.days")}
              </p>
            </>
          ) : (
            <tone.icon className={`h-7 w-7 ${tone.textClass}`} />
          )}
        </div>

        {/* Student + plan info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-3">
            {student && (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[--gold-bg] text-xs font-bold text-[--gold]">
                    {getInitials(student.name)}
                  </div>
                )}
              </div>
            )}
            <Link
              to="/students/$studentId"
              params={{ studentId: m.student_id }}
              className="truncate text-lg font-semibold text-[--tx-primary] transition-colors hover:text-[--gold]"
            >
              {student?.name ?? "—"}
            </Link>
            <StatusPill status={effectiveStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[--tx-muted]">
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] ??
                m.membership_type}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("memberships.startedOn")}: {formatDate(m.start_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("memberships.expiresOn")}: {formatDate(m.end_date)}
            </span>
            {m.price_paid > 0 && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCurrency(m.price_paid)}
              </span>
            )}
            {m.classes_remaining !== null && m.classes_remaining !== undefined && (
              <span className="rounded-full border border-[--bd-default] bg-[--bg-muted] px-2 py-0.5 text-xs font-medium text-[--tx-muted]">
                {t("memberships.sessionsRemaining", { count: m.classes_remaining })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {onNotify && (
          <button
            onClick={onNotify}
            className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
            title={t("memberships.reminder")}
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">{t("memberships.reminder")}</span>
          </button>
        )}
        {onRenew && (
          <button
            onClick={onRenew}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            <Plus className="h-4 w-4" />
            {t("memberships.renewMembership")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Status helpers ──────────────────────────────────────────────────────────

interface StatusTone {
  borderClass: string;
  hoverBorderClass: string;
  badgeClass: string;
  textClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getStatusTone(status: MembershipStatus, days: number): StatusTone {
  // Active + ≤7 days → critical
  if (status === "active" && days <= 7) {
    return {
      borderClass: "border-[--color-danger-bd]",
      hoverBorderClass: "border-[--color-danger-bd]",
      badgeClass: "bg-[--color-danger-bg] border-[--color-danger-bd]",
      textClass: "text-[--color-danger]",
      icon: AlertTriangle,
    };
  }
  // Active + ≤30 days → warning
  if (status === "active" && days <= 30) {
    return {
      borderClass: "border-[--color-warning-bd]",
      hoverBorderClass: "border-[--color-warning-bd]",
      badgeClass: "bg-[--color-warning-bg] border-[--color-warning-bd]",
      textClass: "text-[--color-warning]",
      icon: CreditCard,
    };
  }
  // Healthy active
  if (status === "active") {
    return {
      borderClass: "border-[--bd-default]",
      hoverBorderClass: "border-[--color-success-bd]",
      badgeClass: "bg-[--color-success-bg] border-[--color-success-bd]",
      textClass: "text-[--color-success]",
      icon: CheckCircle2,
    };
  }
  if (status === "frozen") {
    return {
      borderClass: "border-[--color-info-bd]",
      hoverBorderClass: "border-[--color-info-bd]",
      badgeClass: "bg-[--color-info-bg] border-[--color-info-bd]",
      textClass: "text-[--color-info]",
      icon: Snowflake,
    };
  }
  if (status === "expired") {
    return {
      borderClass: "border-[--bd-default]",
      hoverBorderClass: "border-[--color-warning-bd]",
      badgeClass: "bg-[--bg-muted] border-[--bd-default]",
      textClass: "text-[--tx-muted]",
      icon: Calendar,
    };
  }
  // cancelled / pending
  return {
    borderClass: "border-[--bd-subtle]",
    hoverBorderClass: "border-[--bd-default]",
    badgeClass: "bg-[--bg-muted] border-[--bd-subtle]",
    textClass: "text-[--tx-disabled]",
    icon: XCircle,
  };
}

function StatusPill({ status }: { status: MembershipStatus }): React.JSX.Element {
  const { t } = useTranslation();
  const map: Record<MembershipStatus, { label: string; color: string }> = {
    active: { label: t("memberships.active"), color: "var(--color-success)" },
    frozen: { label: t("memberships.frozen"), color: "var(--color-info)" },
    expired: { label: t("memberships.expired"), color: "var(--tx-muted)" },
    cancelled: { label: t("memberships.cancelled"), color: "var(--color-danger)" },
    pending: { label: t("memberships.pending"), color: "var(--color-warning)" },
  };
  const tone = map[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: tone.color + "1a",
        color: tone.color,
      }}
    >
      {tone.label}
    </span>
  );
}
