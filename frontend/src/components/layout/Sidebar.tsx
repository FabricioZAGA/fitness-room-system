import { Link } from "@tanstack/react-router";
import logoFr from "@/assets/logo-fr.png";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CreditCard,
  Home,
  LogOut,
  Package,
  QrCode,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useGymStore } from "@/store/useGymStore";
import { APP_VERSION } from "@/lib/changelog";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: "main" | "operations" | "admin";
  adminOnly?: boolean;
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  return [
    { label: t("nav.home"), to: "/", icon: Home, section: "main" },
    { label: t("nav.checkin"), to: "/checkin", icon: QrCode, section: "operations" },
    { label: t("nav.members"), to: "/students", icon: Users, section: "main" },
    { label: t("nav.classes"), to: "/classes", icon: Calendar, section: "main" },
    { label: t("nav.reservations"), to: "/reservations", icon: CalendarCheck, section: "main" },
    { label: t("nav.memberships"), to: "/memberships", icon: CreditCard, section: "main", adminOnly: true },
    { label: t("nav.caja"), to: "/caja", icon: Receipt, section: "main" },
    { label: t("nav.inventario"), to: "/inventario", icon: Package, section: "main" },
    { label: t("nav.reportes"), to: "/reportes", icon: BarChart3, section: "main", adminOnly: true },
    { label: t("nav.instructors"), to: "/instructors", icon: UserCog, section: "admin" },
    { label: t("nav.users"), to: "/users", icon: Shield, section: "admin" },
    { label: t("nav.settings"), to: "/settings", icon: Settings, section: "admin", adminOnly: true },
  ];
}

const navItemCls = cn(
  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
  "text-[--tx-muted] hover:bg-[--bg-muted]/60 hover:text-[--tx-primary]"
);

const navActiveProps = {
  className: cn(
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
    "bg-[--gold-bg] text-[--gold] border border-[--gold-bd]"
  ),
} as const;

export function Sidebar(): React.JSX.Element {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useTranslation();
  const NAV_ITEMS = useNavItems();
  const gymName = useGymStore((s) => s.name);

  const visibleItems = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const mainItems = visibleItems.filter((i) => i.section === "main");
  const operationsItems = visibleItems.filter((i) => i.section === "operations");
  const adminItems = visibleItems.filter((i) => i.section === "admin");

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <aside
      className="flex h-screen w-72 flex-col border-r border-[--bd-subtle]"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* ── Brand header ── */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="h-11 w-11 shrink-0 overflow-hidden rounded-xl"
          style={{ boxShadow: "var(--shadow-gold)" }}
        >
          <img src={logoFr} alt="Fitness Room" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <span className="block text-base font-bold tracking-tight text-[--tx-primary] truncate">{gymName}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[--tx-disabled]">{t("nav.managementSystem")}</span>
            <span className="text-[10px] font-mono font-medium text-[--gold] bg-[--gold-bg] px-1.5 py-0.5 rounded">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>

      {/* ── Quick Check-in CTA ── */}
      <div className="px-4 pb-3">
        {operationsItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            <Sparkles className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* ── Separator ── */}
      <div className="mx-5 border-t border-[--bd-subtle]" />

      {/* ── Main Navigation ── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-[--tx-disabled]">
          {t("nav.mainMenu")}
        </p>
        {mainItems.map((item) => (
          <Link key={item.to} to={item.to} className={navItemCls} activeProps={navActiveProps}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[--bg-muted]/50 transition-colors group-hover:bg-[--bg-muted]">
              <item.icon className="h-4 w-4 shrink-0" />
            </div>
            {item.label}
          </Link>
        ))}

        {adminItems.length > 0 && (
          <>
            <p className="mb-1.5 mt-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-[--tx-disabled]">
              {t("nav.administration")}
            </p>
            {adminItems.map((item) => (
              <Link key={item.to} to={item.to} className={navItemCls} activeProps={navActiveProps}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[--bg-muted]/50 transition-colors group-hover:bg-[--bg-muted]">
                  <item.icon className="h-4 w-4 shrink-0" />
                </div>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* ── User section ── */}
      <div className="border-t border-[--bd-subtle] px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar with gradient ring */}
          <div className="relative shrink-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, var(--gold-bg) 0%, var(--bg-muted) 100%)",
                border: "2px solid var(--gold-bd)",
                color: "var(--gold)",
              }}
            >
              {initials}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{
                borderColor: "var(--bg-surface)",
                background: "var(--color-success)",
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-[--tx-primary]">
                {user?.name ?? user?.email?.split("@")[0] ?? "Usuario"}
              </p>
              <span className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                isAdmin
                  ? "bg-[--gold-bg] text-[--gold] border border-[--gold-bd]"
                  : "bg-[--color-info-bg] text-[--color-info] border border-[--color-info-bd]"
              )}>
                {isAdmin ? "Admin" : t("nav.reception")}
              </span>
            </div>
            <p className="truncate text-[11px] text-[--tx-disabled]">{user?.email}</p>
          </div>

          <button
            onClick={() => logout()}
            className="shrink-0 rounded-lg p-2 text-[--tx-disabled] hover:bg-[--color-danger-bg] hover:text-[--color-danger] transition-all duration-200"
            title={t("nav.logout")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
