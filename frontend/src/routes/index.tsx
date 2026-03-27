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
} from "lucide-react";
import { useMemo } from "react";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useExpiringSoon } from "@/hooks/useMemberships";
import { useInstructors } from "@/hooks/useInstructors";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage(): React.JSX.Element {
  const today = new Date().toISOString().slice(0, 10);

  const { data: studentsData } = useStudents({ status: "active" });
  const { data: allStudentsData } = useStudents({ limit: 200 });
  const { data: classesData } = useClasses({ upcoming_only: true, limit: 5 });
  const { data: todayClassesData } = useClasses({ date: today, limit: 50 });
  const { data: expiringSoon } = useExpiringSoon(7);
  const { data: instructorsData } = useInstructors({ status: "active" });

  const activeStudents = studentsData?.total ?? 0;
  const todayClasses = todayClassesData?.total ?? 0;
  const expiring = expiringSoon?.length ?? 0;
  const activeInstructors = instructorsData?.items?.length ?? 0;

  const studentMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of allStudentsData?.items ?? []) {
      map[s.student_id] = s.full_name;
    }
    return map;
  }, [allStudentsData]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">¡Bienvenido!</h1>
        <p className="mt-1 text-lg text-slate-400">
          Resumen de hoy en Fitness Room
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          to="/checkin"
          icon={QrCode}
          label="Check-in"
          description="Registrar entrada"
          color="emerald"
        />
        <QuickAction
          to="/students"
          icon={Users}
          label="Nuevo Miembro"
          description="Registrar alumno"
          color="blue"
        />
        <QuickAction
          to="/classes"
          icon={Calendar}
          label="Nueva Clase"
          description="Programar clase"
          color="violet"
        />
        <QuickAction
          to="/memberships"
          icon={CreditCard}
          label="Membresía"
          description="Asignar plan"
          color="amber"
        />
      </div>

      {/* Alert: Expiring Memberships */}
      {expiring > 0 && (
        <Link
          to="/memberships"
          className="mb-8 flex items-center justify-between rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 p-5 transition-all hover:border-amber-500/50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/20 p-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-400">
                {expiring} membresía{expiring !== 1 ? "s" : ""} por vencer
              </p>
              <p className="text-sm text-amber-400/70">
                Contactar miembros para renovación
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-amber-500" />
        </Link>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Miembros Activos"
          value={activeStudents}
          icon={Users}
          color="emerald"
          href="/students"
        />
        <StatCard
          label="Clases Hoy"
          value={todayClasses}
          icon={Calendar}
          color="blue"
          href="/classes"
        />
        <StatCard
          label="Instructores"
          value={activeInstructors}
          icon={UserCog}
          color="violet"
          href="/instructors"
        />
        <StatCard
          label="Por Vencer"
          value={expiring}
          icon={CreditCard}
          color="amber"
          href="/memberships"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Próximas Clases</h2>
            <Link
              to="/classes"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Ver todas →
            </Link>
          </div>
          {classesData?.items.length ? (
            <div className="space-y-3">
              {classesData.items.map((cls) => (
                <div
                  key={cls.class_id}
                  className="flex items-center gap-4 rounded-xl bg-slate-800/50 p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Clock className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {CLASS_TYPE_LABELS[cls.class_type] || cls.class_type}
                    </p>
                    <p className="text-sm text-slate-400">
                      {cls.instructor_name} · {cls.start_time.substring(0, 5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">
                      {cls.reservations_count}/{cls.capacity}
                    </p>
                    <p className="text-xs text-slate-500">reservados</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-800/30 py-12 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-slate-500">No hay clases programadas</p>
            </div>
          )}
        </div>

        {/* Expiring Soon List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Membresías por Vencer</h2>
            <Link
              to="/memberships"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Ver todas →
            </Link>
          </div>
          {expiringSoon && expiringSoon.length > 0 ? (
            <div className="space-y-3">
              {expiringSoon.slice(0, 5).map((m) => (
                <div
                  key={m.membership_id}
                  className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-400">
                      {m.days_until_expiry}d
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {studentMap[m.student_id] ?? m.student_id.slice(0, 8) + "…"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]} · {formatDate(m.end_date)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: m.student_id }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-800/30 py-12 text-center">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-slate-500">No hay membresías por vencer</p>
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
  color,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: "emerald" | "blue" | "violet" | "amber";
}): React.JSX.Element {
  const colors = {
    emerald: "from-emerald-600 to-teal-600 shadow-emerald-600/20",
    blue: "from-blue-600 to-cyan-600 shadow-blue-600/20",
    violet: "from-violet-600 to-purple-600 shadow-violet-600/20",
    amber: "from-amber-600 to-orange-600 shadow-amber-600/20",
  };

  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-2xl bg-gradient-to-r p-5 shadow-lg transition-all hover:scale-[1.02] ${colors[color]}`}
    >
      <Icon className="h-8 w-8 text-white" />
      <div>
        <p className="text-lg font-semibold text-white">{label}</p>
        <p className="text-sm text-white/70">{description}</p>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "emerald" | "blue" | "violet" | "amber";
  href: string;
}): React.JSX.Element {
  const colors = {
    emerald: "border-emerald-500/20 text-emerald-400",
    blue: "border-blue-500/20 text-blue-400",
    violet: "border-violet-500/20 text-violet-400",
    amber: "border-amber-500/20 text-amber-400",
  };

  return (
    <Link
      to={href}
      className={`rounded-2xl border bg-slate-900 p-6 transition-all hover:border-slate-700 ${colors[color].split(" ")[0]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-4xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-xl bg-slate-800 p-3 ${colors[color].split(" ")[1]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}
