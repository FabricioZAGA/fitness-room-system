/** Settings / configuration page. */

import { createFileRoute } from "@tanstack/react-router";
import { Settings, Building2, Bell, ShieldCheck, Info, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/store/useThemeStore";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

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
        </SettingSection>

        {/* Language */}
        <SettingSection
          icon={Info}
          title={t("settings.language")}
          description={t("settings.languageDesc")}
        >
          <div className="flex flex-wrap gap-2">
            <LanguageButton
              lang="es"
              label={t("settings.spanish")}
              current={i18n.language}
              onClick={() => handleLanguageChange("es")}
            />
            <LanguageButton
              lang="en"
              label={t("settings.english")}
              current={i18n.language}
              onClick={() => handleLanguageChange("en")}
            />
          </div>
        </SettingSection>

        <SettingSection
          icon={Building2}
          title={t("settings.gymInfo")}
          description={t("settings.gymInfoDesc")}
          comingSoon
        />
        <SettingSection
          icon={Bell}
          title={t("settings.notifications")}
          description={t("settings.notificationsDesc")}
          comingSoon
        />
        <SettingSection
          icon={ShieldCheck}
          title={t("settings.security")}
          description={t("settings.securityDesc")}
          comingSoon
        />

        {/* System info */}
        <div className="mt-10 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-[--tx-disabled]" />
            <h2 className="text-base font-semibold text-[--tx-primary]">{t("settings.sysInfo")}</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">{t("settings.version")}</dt>
              <dd className="font-mono text-[--tx-primary]">1.0.0-beta</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">{t("settings.environment")}</dt>
              <dd className="rounded-full bg-[--color-warning-bg] px-2.5 py-0.5 text-xs font-medium text-[--color-warning]">
                Local / Desarrollo
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[--tx-disabled]">{t("settings.phase")}</dt>
              <dd className="text-[--tx-primary]">Fase 1 — Core</dd>
            </div>
          </dl>
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
  comingSoon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
  comingSoon?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[--bg-muted]">
            <Icon className="h-5 w-5 text-[--tx-muted]" />
          </div>
          <div>
            <p className="font-semibold text-[--tx-primary]">{title}</p>
            <p className="mt-0.5 text-sm text-[--tx-disabled]">{description}</p>
          </div>
        </div>
        {comingSoon && (
          <span className="shrink-0 rounded-full bg-[--bg-muted] px-3 py-1 text-xs font-medium text-[--tx-disabled]">
            {t("settings.comingSoon")}
          </span>
        )}
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
      className={`flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium transition-all ${
        isActive
          ? "border-[--gold-bd] bg-[--gold-bg] text-[--gold]"
          : "border-[--bd-default] bg-[--bg-muted] text-[--tx-muted] hover:border-[--bd-subtle] hover:text-[--tx-primary]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function LanguageButton({
  lang,
  label,
  current,
  onClick,
}: {
  lang: string;
  label: string;
  current: string;
  onClick: () => void;
}): React.JSX.Element {
  const isActive = current === lang;
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-5 py-3 text-sm font-medium transition-all ${
        isActive
          ? "border-[--gold-bd] bg-[--gold-bg] text-[--gold]"
          : "border-[--bd-default] bg-[--bg-muted] text-[--tx-muted] hover:border-[--bd-subtle] hover:text-[--tx-primary]"
      }`}
    >
      {label}
    </button>
  );
}
