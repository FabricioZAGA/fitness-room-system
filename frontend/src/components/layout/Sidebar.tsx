import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  CreditCard,
  Home,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", to: "/", icon: Home, phase: 1 },
  { label: "Alumnos", to: "/students", icon: Users, phase: 1 },
  { label: "Membresías", to: "/memberships", icon: CreditCard, phase: 1 },
  { label: "Clases", to: "/classes", icon: Calendar, phase: 1 },
  { label: "Reservaciones", to: "/reservations", icon: CalendarCheck, phase: 1 },
  { label: "Configuración", to: "/settings", icon: Settings, phase: 1 },
];

export function Sidebar(): React.JSX.Element {
  const { theme } = useThemeStore();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-5">
        <img
          src={theme.logoPath}
          alt={theme.studioName}
          className="h-8 w-8 rounded-lg object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="truncate text-sm font-semibold text-zinc-100">
          {theme.studioName}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              "[&.active]:bg-violet-500/10 [&.active]:text-violet-400"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <p className="px-3 text-xs text-zinc-600">
          Fitness Room © 2026
        </p>
      </div>
    </aside>
  );
}
