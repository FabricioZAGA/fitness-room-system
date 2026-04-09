import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  Home,
  LogOut,
  Package,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useGymStore } from "@/store/useGymStore";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: "main" | "operations" | "admin";
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  return [
    { label: t("nav.home"), to: "/", icon: Home, section: "main" },
    { label: t("nav.checkin"), to: "/checkin", icon: QrCode, section: "operations" },
    { label: "Kiosco QR", to: "/checkin-kiosk", icon: ScanLine, section: "operations" },
    { label: t("nav.members"), to: "/students", icon: Users, section: "main" },
    { label: t("nav.classes"), to: "/classes", icon: Calendar, section: "main" },
    { label: t("nav.reservations"), to: "/reservations", icon: CalendarCheck, section: "main" },
    { label: t("nav.memberships"), to: "/memberships", icon: CreditCard, section: "main" },
    { label: t("nav.caja"), to: "/caja", icon: Receipt, section: "main" },
    { label: t("nav.inventario"), to: "/inventario", icon: Package, section: "main" },
    { label: t("nav.reportes"), to: "/reportes", icon: BarChart3, section: "main" },
    { label: t("nav.instructors"), to: "/instructors", icon: UserCog, section: "admin" },
    { label: t("nav.settings"), to: "/settings", icon: Settings, section: "admin" },
  ];
}

const navItemCls = cn(
  "flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-all",
  "text-[--tx-muted] hover:bg-[--bg-muted] hover:text-[--tx-primary]"
);

const navActiveProps = {
  style: {
    background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
    color: "var(--gold-fg)",
  },
} as const;

export function Sidebar(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const NAV_ITEMS = useNavItems();
  const gymName = useGymStore((s) => s.name);

  const mainItems = NAV_ITEMS.filter((i) => i.section === "main");
  const operationsItems = NAV_ITEMS.filter((i) => i.section === "operations");
  const adminItems = NAV_ITEMS.filter((i) => i.section === "admin");

  return (
    <aside className="flex h-screen w-72 flex-col bg-[--bg-surface] border-r border-[--bd-default]">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-[--bd-default] px-6">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            boxShadow: "0 4px 14px var(--gold-bg)",
          }}
        >
          <Dumbbell className="h-7 w-7 text-[--gold-fg]" />
        </div>
        <div>
          <span className="block text-lg font-bold text-[--tx-primary]">{gymName}</span>
          <span className="text-xs text-[--tx-muted]">{t("nav.managementSystem")}</span>
        </div>
      </div>

      {/* Quick Check-in Action */}
      <div className="p-4">
        {operationsItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-center gap-3 rounded-xl px-4 py-4 text-base font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 4px 16px var(--gold-bg)",
            }}
          >
            <item.icon className="h-6 w-6" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">
          {t("nav.mainMenu")}
        </p>
        {mainItems.map((item) => (
          <Link key={item.to} to={item.to} className={navItemCls} activeProps={navActiveProps}>
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}

        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">
          {t("nav.administration")}
        </p>
        {adminItems.map((item) => (
          <Link key={item.to} to={item.to} className={navItemCls} activeProps={navActiveProps}>
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-[--bd-default] p-4">
        <div className="flex items-center gap-3 rounded-xl bg-[--bg-muted] p-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold border border-[--gold-bd] bg-[--gold-bg] text-[--gold]"
          >
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[--tx-primary]">
              {user?.name ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-[--tx-muted]">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg p-2 text-[--tx-disabled] hover:bg-[--bg-elevated] hover:text-[--tx-primary] transition-colors"
            title={t("nav.logout")}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
