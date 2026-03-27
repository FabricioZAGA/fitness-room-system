import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { useExpiringSoon } from "@/hooks/useMemberships";
import { MembershipStatusBadge } from "@/components/shared/StatusBadge";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate, formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/memberships/")({
  component: MembershipsPage,
});

function MembershipsPage(): React.JSX.Element {
  const { data: expiring, isLoading } = useExpiringSoon(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Membresías</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Gestión de membresías y alertas de renovación
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">
          Membresías que vencen en los próximos 30 días
        </h2>

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : !expiring || expiring.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CreditCard className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">
              No hay membresías por vencer en los próximos 30 días
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Alumno</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Vence</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Días</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Estado</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {expiring.map((m) => (
                  <tr key={m.membership_id} className="hover:bg-zinc-800/50">
                    <td className="px-3 py-3 font-medium text-zinc-200">{m.student_id}</td>
                    <td className="px-3 py-3 text-zinc-400">
                      {MEMBERSHIP_TYPE_LABELS[m.membership_type]}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{formatDate(m.end_date)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs font-medium ${
                          (m.days_until_expiry ?? 0) <= 3 ? "text-red-400" : "text-amber-400"
                        }`}
                      >
                        {m.days_until_expiry ?? 0}d
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <MembershipStatusBadge status={m.status} />
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{formatCurrency(m.price_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
