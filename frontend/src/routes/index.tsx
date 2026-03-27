import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CreditCard, TrendingUp, Users } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useExpiringSoon } from "@/hooks/useMemberships";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

function StatCard({ title, value, description, icon: Icon, href, color }: StatCardProps): React.JSX.Element {
  return (
    <Link to={href} className="card block p-6 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-100">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        <div className={cn("rounded-xl p-3", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function DashboardPage(): React.JSX.Element {
  const { data: studentsData } = useStudents({ status: "active" });
  const { data: classesData } = useClasses({ upcoming_only: true, limit: 5 });
  const { data: expiringSoon } = useExpiringSoon(7);

  const activeStudents = studentsData?.total ?? 0;
  const upcomingClasses = classesData?.total ?? 0;
  const expiring = expiringSoon?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Resumen general del estudio Fitness Room.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Alumnos Activos"
          value={activeStudents}
          description="Total con membresía activa"
          icon={Users}
          href="/students"
          color="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          title="Clases Próximas"
          value={upcomingClasses}
          description="Clases programadas"
          icon={Calendar}
          href="/classes"
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Membresías por Vencer"
          value={expiring}
          description="Próximos 7 días"
          icon={CreditCard}
          href="/memberships"
          color="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          title="Asistencia"
          value="—"
          description="Disponible en Fase 2"
          icon={TrendingUp}
          href="/"
          color="bg-green-500/10 text-green-400"
        />
      </div>

      {expiring > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-400">
            ⚠️ {expiring} membresía{expiring !== 1 ? "s" : ""} vence{expiring === 1 ? "" : "n"} en los próximos 7 días
          </p>
          <Link to="/memberships" className="mt-1 text-xs text-amber-400/70 hover:text-amber-400 underline">
            Ver membresías →
          </Link>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Próximas Clases</h2>
        {classesData?.items.length ? (
          <ul className="space-y-3">
            {classesData.items.map((cls) => (
              <li key={cls.class_id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{cls.instructor_name}</p>
                  <p className="text-xs text-zinc-500">
                    {cls.class_date} · {cls.start_time.substring(0, 5)}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">
                  {cls.reservations_count}/{cls.capacity}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No hay clases programadas próximamente.</p>
        )}
      </div>
    </div>
  );
}
