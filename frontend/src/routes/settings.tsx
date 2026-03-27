/** Settings / configuration page. */

import { createFileRoute } from "@tanstack/react-router";
import { Settings, Building2, Bell, ShieldCheck, Info } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Configuración</h1>
        <p className="mt-1 text-lg text-slate-400">Ajustes del sistema</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <SettingSection
          icon={Building2}
          title="Información del Gimnasio"
          description="Nombre, dirección y datos de contacto del negocio"
          comingSoon
        />
        <SettingSection
          icon={Bell}
          title="Notificaciones"
          description="Alertas de vencimiento de membresías y recordatorios"
          comingSoon
        />
        <SettingSection
          icon={ShieldCheck}
          title="Seguridad"
          description="Cambio de contraseña y gestión de accesos"
          comingSoon
        />
        <SettingSection
          icon={Settings}
          title="Preferencias"
          description="Idioma, zona horaria y formato de fechas"
          comingSoon
        />

        {/* System info */}
        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-semibold text-white">Información del sistema</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Versión</dt>
              <dd className="font-mono text-slate-300">1.0.0-beta</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Entorno</dt>
              <dd className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                Local / Desarrollo
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Fase del proyecto</dt>
              <dd className="text-slate-300">Fase 1 — Core</dd>
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
  comingSoon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  comingSoon?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800">
          <Icon className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {comingSoon && (
        <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500">
          Próximamente
        </span>
      )}
    </div>
  );
}
