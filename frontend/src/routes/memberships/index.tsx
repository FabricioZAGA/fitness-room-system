import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CreditCard, Plus, Calendar, DollarSign } from "lucide-react";
import { useExpiringSoon } from "@/hooks/useMemberships";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Membership } from "@/types/membership";

export const Route = createFileRoute("/memberships/")({
  component: MembershipsPage,
});

function MembershipsPage(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: expiring7, isLoading } = useExpiringSoon(7);
  const { data: expiring30 } = useExpiringSoon(30);

  const critical = expiring7 ?? [];
  const all30 = expiring30 ?? [];
  const warning = all30.filter(
    (m) => !critical.find((c) => c.membership_id === m.membership_id)
  );

  return (
    <>
      <div className="min-h-screen bg-slate-950 p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Membresías</h1>
            <p className="mt-1 text-lg text-slate-400">
              Alertas de vencimiento y gestión de planes
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5" />
            Nueva Membresía
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/20 p-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{critical.length}</p>
                <p className="text-sm text-red-400">Vencen esta semana</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/20 p-3">
                <CreditCard className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{all30.length}</p>
                <p className="text-sm text-amber-400">Vencen en 30 días</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/20 p-3">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(all30.reduce((sum, m) => sum + (m.price_paid ?? 0), 0))}
                </p>
                <p className="text-sm text-emerald-400">Renovaciones pendientes</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : all30.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 py-20 text-center">
            <CreditCard className="mx-auto mb-4 h-16 w-16 text-slate-700" />
            <p className="text-xl text-slate-400">
              No hay membresías por vencer en los próximos 30 días
            </p>
            <p className="mt-2 text-slate-500">¡Todo al día!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CRITICAL — vencen en 7 días */}
            {critical.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Urgente — vencen en 7 días ({critical.length})
                </h2>
                <div className="space-y-3">
                  {critical.map((m) => (
                    <MembershipCard key={m.membership_id} membership={m} urgency="critical" />
                  ))}
                </div>
              </section>
            )}

            {/* WARNING — 8-30 días */}
            {warning.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-400">
                  <CreditCard className="h-5 w-5" />
                  Próximamente — 8 a 30 días ({warning.length})
                </h2>
                <div className="space-y-3">
                  {warning.map((m) => (
                    <MembershipCard key={m.membership_id} membership={m} urgency="warning" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <CreateMembershipModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function MembershipCard({
  membership: m,
  urgency,
}: {
  membership: Membership;
  urgency: "critical" | "warning";
}): React.JSX.Element {
  const days = m.days_until_expiry ?? 0;

  const borderColor =
    urgency === "critical" ? "border-red-500/20" : "border-amber-500/20";
  const bgColor =
    urgency === "critical" ? "hover:border-red-500/40" : "hover:border-amber-500/40";
  const daysColor = urgency === "critical" ? "text-red-400" : "text-amber-400";
  const daysBg =
    urgency === "critical"
      ? "bg-red-500/10 border border-red-500/20"
      : "bg-amber-500/10 border border-amber-500/20";

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border bg-slate-900 p-5 transition-all ${borderColor} ${bgColor}`}
    >
      <div className="flex items-center gap-5">
        {/* Days countdown */}
        <div
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${daysBg}`}
        >
          <p className={`text-2xl font-bold ${daysColor}`}>{days}</p>
          <p className="text-xs text-slate-500">días</p>
        </div>

        {/* Info */}
        <div>
          <Link
            to="/students/$studentId"
            params={{ studentId: m.student_id }}
            className="text-lg font-semibold text-white hover:text-emerald-400 transition-colors"
          >
            Ver miembro →
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Vence: {formatDate(m.end_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(m.price_paid)}
            </span>
          </div>
        </div>
      </div>

      {/* Renew button */}
      <button
        onClick={() => {}}
        className="hidden shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 sm:block"
      >
        Renovar
      </button>
    </div>
  );
}
