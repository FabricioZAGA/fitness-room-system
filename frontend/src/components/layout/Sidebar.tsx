import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  Home,
  LogOut,
  QrCode,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: "main" | "operations" | "admin";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", to: "/", icon: Home, section: "main" },
  { label: "Check-in", to: "/checkin", icon: QrCode, section: "operations" },
  { label: "Miembros", to: "/students", icon: Users, section: "main" },
  { label: "Clases", to: "/classes", icon: Calendar, section: "main" },
  { label: "Reservaciones", to: "/reservations", icon: CalendarCheck, section: "main" },
  { label: "Membresías", to: "/memberships", icon: CreditCard, section: "main" },
  { label: "Instructores", to: "/instructors", icon: UserCog, section: "admin" },
  { label: "Configuración", to: "/settings", icon: Settings, section: "admin" },
];

export function Sidebar(): React.JSX.Element {
  const { user, logout } = useAuth();

  const mainItems = NAV_ITEMS.filter((i) => i.section === "main");
  const operationsItems = NAV_ITEMS.filter((i) => i.section === "operations");
  const adminItems = NAV_ITEMS.filter((i) => i.section === "admin");

  return (
    <aside className="flex h-screen w-72 flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
          <Dumbbell className="h-7 w-7 text-white" />
        </div>
        <div>
          <span className="block text-lg font-bold text-white">Fitness Room</span>
          <span className="text-xs text-slate-500">Sistema de Gestión</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        {operationsItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:shadow-emerald-500/30 hover:scale-[1.02]"
          >
            <item.icon className="h-6 w-6" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Menú Principal
        </p>
        {mainItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-all",
              "text-slate-400 hover:bg-slate-800 hover:text-white",
              "[&.active]:bg-emerald-500/10 [&.active]:text-emerald-400 [&.active]:border [&.active]:border-emerald-500/20"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}

        {/* Admin section */}
        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Administración
        </p>
        {adminItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-all",
              "text-slate-400 hover:bg-slate-800 hover:text-white",
              "[&.active]:bg-emerald-500/10 [&.active]:text-emerald-400 [&.active]:border [&.active]:border-emerald-500/20"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "Usuario"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-700 hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
