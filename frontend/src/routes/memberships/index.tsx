import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CreditCard, Plus, Calendar, DollarSign, Mail } from "lucide-react";
import { useExpiringSoon } from "@/hooks/useMemberships";
import { useStudents } from "@/hooks/useStudents";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { useSendCustomNotification } from "@/hooks/useNotifications";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import type { Membership } from "@/types/membership";

export const Route = createFileRoute("/memberships/")({
  component: MembershipsPage,
});

function MembershipsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [renewStudentId, setRenewStudentId] = useState<string | null>(null);
  const { data: expiring7, isLoading } = useExpiringSoon(7);
  const { data: expiring30 } = useExpiringSoon(30);
  const { data: studentsData } = useStudents({ limit: 200 });
  const notifyMutation = useSendCustomNotification();

  const critical = expiring7 ?? [];
  const all30 = expiring30 ?? [];
  const warning = all30.filter(
    (m) => !critical.find((c) => c.membership_id === m.membership_id)
  );

  const studentMap = useMemo(() => {
    const map: Record<string, { name: string; photo_url: string | null }> = {};
    for (const s of studentsData?.items ?? []) map[s.student_id] = { name: s.full_name, photo_url: s.photo_url };
    return map;
  }, [studentsData]);

  return (
    <>
      <div className="min-h-screen bg-[--bg-base] p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--tx-primary]">{t("memberships.title")}</h1>
            <p className="mt-1 text-lg text-[--tx-muted]">
              {t("memberships.alertsDesc")}
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 25px var(--gold-bg)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
          >
            <Plus className="h-5 w-5" />
            {t("memberships.newMembership")}
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[--color-danger-bd] bg-[--color-danger-bg] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[--color-danger-bg] p-3">
                <AlertTriangle className="h-6 w-6 text-[--color-danger]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[--tx-primary]">{critical.length}</p>
                <p className="text-sm text-[--color-danger]">{t("memberships.expireThisWeek")}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[--color-warning-bd] bg-[--color-warning-bg] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[--color-warning-bg] p-3">
                <CreditCard className="h-6 w-6 text-[--color-warning]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[--tx-primary]">{all30.length}</p>
                <p className="text-sm text-[--color-warning]">{t("memberships.expireIn30")}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[--color-success-bd] bg-[--color-success-bg] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[--color-success-bg] p-3">
                <DollarSign className="h-6 w-6 text-[--color-success]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[--tx-primary]">
                  {formatCurrency(all30.reduce((sum, m) => sum + (m.price_paid ?? 0), 0))}
                </p>
                <p className="text-sm text-[--color-success]">{t("memberships.pendingRenewals")}</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
          </div>
        ) : all30.length === 0 ? (
          <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] py-20 text-center">
            <CreditCard className="mx-auto mb-4 h-16 w-16 text-[--tx-disabled]" />
            <p className="text-xl text-[--tx-muted]">
              {t("memberships.noExpiringLong")}
            </p>
            <p className="mt-2 text-[--tx-disabled]">{t("memberships.allUpToDate")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CRITICAL — vencen en 7 días */}
            {critical.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[--color-danger]">
                  <AlertTriangle className="h-5 w-5" />
                  {t("memberships.critical")} ({critical.length})
                </h2>
                <div className="space-y-3">
                  {critical.map((m) => (
                    <MembershipCard key={m.membership_id} membership={m} urgency="critical" student={studentMap[m.student_id]} onRenew={() => setRenewStudentId(m.student_id)}
                    onNotify={() => notifyMutation.mutate({
                      studentId: m.student_id,
                      data: {
                        subject: `Recordatorio: tu membresía vence en ${m.days_until_expiry ?? 0} días`,
                        message: `Hola, te recordamos que tu membresía vence el ${m.end_date}. Visítanos para renovarla y seguir entrenando sin interrupciones.`,
                      },
                    })} />
                  ))}
                </div>
              </section>
            )}

            {/* WARNING — 8-30 días */}
            {warning.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[--color-warning]">
                  <CreditCard className="h-5 w-5" />
                  {t("memberships.warning")} ({warning.length})
                </h2>
                <div className="space-y-3">
                  {warning.map((m) => (
                    <MembershipCard key={m.membership_id} membership={m} urgency="warning" student={studentMap[m.student_id]} onRenew={() => setRenewStudentId(m.student_id)}
                    onNotify={() => notifyMutation.mutate({
                      studentId: m.student_id,
                      data: {
                        subject: `Recordatorio: tu membresía vence en ${m.days_until_expiry ?? 0} días`,
                        message: `Hola, te recordamos que tu membresía vence el ${m.end_date}. Visítanos para renovarla y seguir entrenando sin interrupciones.`,
                      },
                    })} />
                  ))}
                </div>
              </section>
            )}
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

function MembershipCard({
  membership: m,
  urgency,
  student,
  onRenew,
  onNotify,
}: {
  membership: Membership;
  urgency: "critical" | "warning";
  student?: { name: string; photo_url: string | null };
  onRenew?: () => void;
  onNotify?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const days = m.days_until_expiry ?? 0;

  const borderColor =
    urgency === "critical" ? "border-[--color-danger-bd]" : "border-[--color-warning-bd]";
  const bgColor =
    urgency === "critical" ? "hover:border-[--color-danger-bd]" : "hover:border-[--color-warning-bd]";
  const daysColor = urgency === "critical" ? "text-[--color-danger]" : "text-[--color-warning]";
  const daysBg =
    urgency === "critical"
      ? "bg-[--color-danger-bg] border border-[--color-danger-bd]"
      : "bg-[--color-warning-bg] border border-[--color-warning-bd]";

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border bg-[--bg-surface] p-5 transition-all ${borderColor} ${bgColor}`}
    >
      <div className="flex items-center gap-5">
        {/* Days countdown */}
        <div
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${daysBg}`}
        >
          <p className={`text-2xl font-bold ${daysColor}`}>{days}</p>
          <p className="text-xs text-[--tx-disabled]">{t("memberships.days")}</p>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            {student && (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[--color-success-bg] text-xs font-bold text-[--color-success]">
                    {getInitials(student.name)}
                  </div>
                )}
              </div>
            )}
            <Link
              to="/students/$studentId"
              params={{ studentId: m.student_id }}
              className="text-lg font-semibold text-[--tx-primary] hover:text-[--color-success] transition-colors"
            >
              {student?.name ?? "Ver miembro →"}
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-[--tx-muted]">
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("checkin.expires")}: {formatDate(m.end_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(m.price_paid)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="hidden shrink-0 gap-2 sm:flex">
        {onNotify && (
          <button
            onClick={onNotify}
            className="flex items-center gap-1.5 rounded-xl border border-[--bd-default] px-3 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
          >
            <Mail className="h-4 w-4" />
            {t("memberships.reminder")}
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
            {t("memberships.renewMembership")}
          </button>
        )}
      </div>
    </div>
  );
}
