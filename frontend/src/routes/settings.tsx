/** Settings / configuration page. */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Bell,
  ShieldCheck,
  Info,
  Moon,
  Sun,
  Save,
  Eye,
  EyeOff,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updatePassword } from "aws-amplify/auth";
import { useThemeStore } from "@/store/useThemeStore";
import { useGymStore } from "@/store/useGymStore";
import type { GymInfo, NotifSettings } from "@/store/useGymStore";
import {
  useSendExpiryReminders,
  useSendInactivityAlerts,
  useRecentNotifications,
} from "@/hooks/useNotifications";
import { NOTIFICATION_TYPE_LABELS } from "@/types/notification";
import type { NotificationResponse } from "@/types/notification";
import { SuppressionCard } from "@/components/shared/SuppressionCard";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-2.5 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

const goldActiveStyle = {
  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
  color: "var(--gold-fg)",
  border: "1px solid transparent",
} as const;

const APP_VERSION = "1.5.0";
const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: "1.5.0",
    date: "2026-04-23",
    changes: [
      "Cursor pointer en todos los elementos interactivos",
      "Pantalla de configuración 100% funcional",
      "Info del sistema con versión y cambios reales",
      "Gestión de WAF y costos AWS optimizados",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-04",
    changes: [
      "Rediseño UI de miembros y membresías",
      "Modelo de estados de membresía con lógica en cascada",
      "Teléfono E.164, dirección estructurada",
      "Gestión de usuarios con RBAC",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03",
    changes: [
      "Fotos de perfil de alumnos",
      "Modo de clase (presencial/virtual)",
      "Control de acceso por roles (admin/staff)",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-02",
    changes: [
      "Portal de alumnos e instructores",
      "Código QR personal para check-in",
      "Congelamiento de membresías",
      "Exportación de reportes a PDF y Excel",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-01",
    changes: [
      "Notificaciones por email (SES)",
      "Reportes financieros y de asistencia",
      "Módulo de caja e inventario",
    ],
  },
  {
    version: "1.0.0",
    date: "2025-12",
    changes: [
      "Lanzamiento inicial — Alumnos, Membresías, Clases",
      "Reservaciones, Instructores, Check-in, Dashboard",
    ],
  },
];

function getEnvironmentLabel(): { label: string; color: string } {
  const env = import.meta.env.VITE_ENV ?? import.meta.env.MODE ?? "development";
  if (env === "production" || env === "prod")
    return { label: "Producción", color: "var(--color-success)" };
  if (env === "staging") return { label: "Staging", color: "var(--color-info)" };
  return { label: "Desarrollo / Local", color: "var(--color-warning)" };
}

function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { i18n } = useTranslation();
  const gym = useGymStore();
  const [showChangelog, setShowChangelog] = useState(false);

  // ── Gym info form ──────────────────────────────────────────────────
  const [gymForm, setGymForm] = useState<GymInfo>({
    name: gym.name,
    address: gym.address,
    phone: gym.phone,
    email: gym.email,
    website: gym.website,
  });

  const handleGymSave = (): void => {
    gym.saveGymInfo(gymForm);
    toast.success("Información del Studio guardada");
  };

  // ── Notification settings form + send actions ─────────────────────
  const [notifForm, setNotifForm] = useState<NotifSettings>({
    criticalDays: gym.criticalDays,
    warningDays: gym.warningDays,
    inactiveDays: gym.inactiveDays,
  });

  const handleNotifSave = (): void => {
    gym.saveNotifSettings(notifForm);
    toast.success("Configuración de alertas guardada");
  };

  const expiryMutation = useSendExpiryReminders();
  const inactivityMutation = useSendInactivityAlerts();
  const { data: recentNotifs = [], isLoading: notifsLoading } = useRecentNotifications(20);

  // ── Password change form ───────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const pwMismatch = pwForm.next.length > 0 && pwForm.next !== pwForm.confirm;
  const pwReady = pwForm.current.length > 0 && pwForm.next.length >= 8 && !pwMismatch;

  const handlePasswordChange = async (): Promise<void> => {
    if (!pwReady) return;
    if (import.meta.env.VITE_ENV === "local" || import.meta.env.MODE === "development") {
      toast.info("Cambio de contraseña no disponible en modo desarrollo local");
      return;
    }
    setPwLoading(true);
    try {
      await updatePassword({ oldPassword: pwForm.current, newPassword: pwForm.next });
      toast.success("Contraseña actualizada exitosamente");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cambiar contraseña";
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleLanguageChange = (lang: string): void => {
    void i18n.changeLanguage(lang);
  };

  const envInfo = getEnvironmentLabel();

  return (
    <div className="min-h-screen bg-[--bg-base] p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--tx-primary]">{t("settings.title")}</h1>
        <p className="mt-1 text-lg text-[--tx-muted]">{t("settings.subtitle")}</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Appearance */}
        <SettingSection
          icon={Moon}
          title={t("settings.appearance")}
          description={t("settings.appearanceDesc")}
        >
          <div className="flex flex-wrap gap-2">
            <ThemeButton
              mode="light"
              icon={Sun}
              label={t("settings.lightMode")}
              current={theme.mode}
              onClick={() => setTheme({ mode: "light" })}
            />
            <ThemeButton
              mode="dark"
              icon={Moon}
              label={t("settings.darkMode")}
              current={theme.mode}
              onClick={() => setTheme({ mode: "dark" })}
            />
          </div>
          <p className="mt-2 text-xs text-[--tx-disabled]">
            Guardado automáticamente en tu navegador
          </p>
        </SettingSection>

        {/* Language */}
        <SettingSection
          icon={Globe}
          title={t("settings.language")}
          description={t("settings.languageDesc")}
        >
          <div className="flex flex-wrap gap-2">
            <LanguageButton
              lang="es"
              flag="🇲🇽"
              label={t("settings.spanish")}
              current={i18n.language}
              onClick={() => handleLanguageChange("es")}
            />
            <LanguageButton
              lang="en"
              flag="🇺🇸"
              label={t("settings.english")}
              current={i18n.language}
              onClick={() => handleLanguageChange("en")}
            />
          </div>
          <p className="mt-2 text-xs text-[--tx-disabled]">
            Guardado automáticamente en tu navegador
          </p>
        </SettingSection>

        {/* Gym Info */}
        <SettingSection
          icon={Building2}
          title={t("settings.gymInfo")}
          description={t("settings.gymInfoDesc")}
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Nombre del Studio
                </label>
                <input
                  className={inputCls}
                  value={gymForm.name}
                  onChange={(e) => setGymForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Fitness Room"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Teléfono
                </label>
                <input
                  className={inputCls}
                  value={gymForm.phone}
                  onChange={(e) => setGymForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+52 55 0000 0000"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                Dirección
              </label>
              <input
                className={inputCls}
                value={gymForm.address}
                onChange={(e) => setGymForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Calle, Colonia, Ciudad"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Email de contacto
                </label>
                <input
                  type="email"
                  className={inputCls}
                  value={gymForm.email}
                  onChange={(e) => setGymForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contacto@fitnessroom.mx"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Sitio web
                </label>
                <input
                  type="url"
                  className={inputCls}
                  value={gymForm.website}
                  onChange={(e) => setGymForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://fitnessroom.mx"
                />
              </div>
            </div>
            <button
              onClick={handleGymSave}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
              style={goldActiveStyle}
            >
              <Save className="h-4 w-4" />
              Guardar información
            </button>
          </div>
        </SettingSection>

        {/* Notifications */}
        <SettingSection
          icon={Bell}
          title={t("settings.notifications")}
          description={t("settings.notificationsDesc")}
        >
          <div className="space-y-5">
            {/* Threshold config */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Alerta crítica (días)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className={inputCls}
                  value={notifForm.criticalDays}
                  onChange={(e) =>
                    setNotifForm((f) => ({ ...f, criticalDays: Number(e.target.value) }))
                  }
                />
                <p className="mt-1 text-xs text-[--tx-disabled]">Membresías en rojo</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Aviso próximo (días)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  className={inputCls}
                  value={notifForm.warningDays}
                  onChange={(e) =>
                    setNotifForm((f) => ({ ...f, warningDays: Number(e.target.value) }))
                  }
                />
                <p className="mt-1 text-xs text-[--tx-disabled]">Membresías en amarillo</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                  Inactividad (días)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  className={inputCls}
                  value={notifForm.inactiveDays}
                  onChange={(e) =>
                    setNotifForm((f) => ({ ...f, inactiveDays: Number(e.target.value) }))
                  }
                />
                <p className="mt-1 text-xs text-[--tx-disabled]">Umbral de inactividad</p>
              </div>
            </div>

            <button
              onClick={handleNotifSave}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
              style={goldActiveStyle}
            >
              <Save className="h-4 w-4" />
              Guardar umbrales
            </button>

            {/* Manual send triggers */}
            <div className="border-t border-[--bd-default] pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">
                Envío manual de notificaciones
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    expiryMutation.mutate({
                      critical_days: notifForm.criticalDays,
                      warning_days: notifForm.warningDays,
                    })
                  }
                  disabled={expiryMutation.isPending}
                  className="flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold] disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {expiryMutation.isPending ? "Enviando..." : "Recordatorios de vencimiento"}
                </button>
                <button
                  onClick={() =>
                    inactivityMutation.mutate({ inactive_days: notifForm.inactiveDays })
                  }
                  disabled={inactivityMutation.isPending}
                  className="flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold] disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {inactivityMutation.isPending ? "Enviando..." : "Alertas de inactividad"}
                </button>
              </div>
            </div>

            {/* Recent notifications log */}
            <div className="border-t border-[--bd-default] pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[--tx-disabled]">
                Últimas notificaciones enviadas
              </p>
              {notifsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-xl bg-[--bg-muted]"
                    />
                  ))}
                </div>
              ) : recentNotifs.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-3">
                  <Bell className="h-4 w-4 text-[--tx-disabled]" />
                  <p className="text-sm text-[--tx-disabled]">
                    No hay notificaciones recientes. Usa los botones de arriba para enviar.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {recentNotifs.map((n: NotificationResponse) => (
                    <div
                      key={n.notification_id}
                      className="flex items-center gap-3 rounded-xl bg-[--bg-muted] px-3 py-2.5"
                    >
                      {n.status === "sent" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[--color-success]" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-[--color-danger]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-[--tx-primary]">
                          {n.student_name ?? "—"} ·{" "}
                          {NOTIFICATION_TYPE_LABELS[n.notification_type] ?? n.notification_type}
                        </p>
                        <p className="text-xs text-[--tx-disabled]">
                          {new Date(n.sent_at).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      {n.status === "failed" && n.error_message && (
                        <span
                          className="shrink-0 rounded-full bg-[--color-danger-bg] px-2 py-0.5 text-[10px] text-[--color-danger]"
                          title={n.error_message}
                        >
                          Error
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SettingSection>

        {/* Email delivery health / suppression list */}
        <SuppressionCard />

        {/* Security */}
        <SettingSection
          icon={ShieldCheck}
          title={t("settings.security")}
          description={t("settings.securityDesc")}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  className={inputCls + " pr-10"}
                  value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--tx-disabled] hover:text-[--tx-muted]"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  className={inputCls + " pr-10"}
                  value={pwForm.next}
                  onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--tx-disabled] hover:text-[--tx-muted]"
                >
                  {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwForm.next.length > 0 && pwForm.next.length < 8 && (
                <p className="mt-1 text-xs text-[--color-danger]">Mínimo 8 caracteres</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                className={
                  inputCls +
                  (pwMismatch ? " border-[--color-danger] focus:border-[--color-danger]" : "")
                }
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {pwMismatch && (
                <p className="mt-1 text-xs text-[--color-danger]">Las contraseñas no coinciden</p>
              )}
            </div>
            <button
              onClick={() => void handlePasswordChange()}
              disabled={!pwReady || pwLoading}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              style={goldActiveStyle}
            >
              <ShieldCheck className="h-4 w-4" />
              {pwLoading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </SettingSection>

        {/* System info */}
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-[--tx-disabled]" />
            <h2 className="text-base font-semibold text-[--tx-primary]">{t("settings.sysInfo")}</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">{t("settings.version")}</dt>
              <dd className="font-mono text-[--tx-primary]">v{APP_VERSION}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">{t("settings.environment")}</dt>
              <dd
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: envInfo.color + "1a",
                  color: envInfo.color,
                }}
              >
                {envInfo.label}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">{t("settings.phase")}</dt>
              <dd className="text-[--tx-primary]">Fase 2.5 — Portal &amp; QR</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">Última actualización</dt>
              <dd className="flex items-center gap-1.5 text-[--tx-muted]">
                <Clock className="h-3 w-3" />
                23 abr 2026
              </dd>
            </div>
          </dl>

          {/* Changelog toggle */}
          <div className="mt-4 border-t border-[--bd-subtle] pt-4">
            <button
              onClick={() => setShowChangelog((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-[--tx-muted] hover:text-[--gold] transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              {showChangelog ? "Ocultar" : "Ver"} historial de versiones
            </button>

            {showChangelog && (
              <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                {CHANGELOG.map((entry) => (
                  <div key={entry.version} className="rounded-xl bg-[--bg-muted] p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-semibold text-[--gold]">
                        v{entry.version}
                      </span>
                      <span className="text-xs text-[--tx-disabled]">{entry.date}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {entry.changes.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-[--tx-muted]">
                          <span className="mt-0.5 text-[--gold] shrink-0">·</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[--bg-muted]">
          <Icon className="h-5 w-5 text-[--tx-muted]" />
        </div>
        <div>
          <p className="font-semibold text-[--tx-primary]">{title}</p>
          <p className="mt-0.5 text-sm text-[--tx-disabled]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ThemeButton({
  mode,
  icon: Icon,
  label,
  current,
  onClick,
}: {
  mode: "light" | "dark" | "system";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current: string;
  onClick: () => void;
}): React.JSX.Element {
  const isActive = current === mode;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-medium transition-all"
      style={
        isActive
          ? goldActiveStyle
          : {
              border: "1px solid var(--bd-default)",
              background: "var(--bg-muted)",
              color: "var(--tx-muted)",
            }
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function LanguageButton({
  lang,
  flag,
  label,
  current,
  onClick,
}: {
  lang: string;
  flag: string;
  label: string;
  current: string;
  onClick: () => void;
}): React.JSX.Element {
  const isActive = current === lang || current.startsWith(lang);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all"
      style={
        isActive
          ? goldActiveStyle
          : {
              border: "1px solid var(--bd-default)",
              background: "var(--bg-muted)",
              color: "var(--tx-muted)",
            }
      }
    >
      <span className="text-base leading-none">{flag}</span>
      {label}
    </button>
  );
}
