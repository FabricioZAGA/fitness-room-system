/** Reusable user card displaying Cognito user info with action buttons. */

import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldBan,
  UserX,
  UserCheck,
  Trash2,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Link2,
  Send,
  Loader2,
} from "lucide-react";
import type { CognitoUser } from "@/services/userService";
import { USER_GROUP_LABELS, USER_GROUP_COLORS, type UserGroup } from "@/lib/userGroups";

type CognitoStatus =
  | "CONFIRMED"
  | "FORCE_CHANGE_PASSWORD"
  | "UNCONFIRMED"
  | "RESET_REQUIRED"
  | "EXTERNAL_PROVIDER"
  | "UNKNOWN"
  | (string & {});

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  border: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  CONFIRMED: {
    label: "Confirmado",
    icon: CheckCircle2,
    bg: "var(--color-success-bg)",
    text: "var(--color-success)",
    border: "var(--color-success-bd)",
  },
  FORCE_CHANGE_PASSWORD: {
    label: "Cambio de contraseña pendiente",
    icon: Clock,
    bg: "var(--color-warning-bg)",
    text: "var(--color-warning)",
    border: "var(--color-warning-bd)",
  },
  UNCONFIRMED: {
    label: "Sin confirmar",
    icon: AlertTriangle,
    bg: "var(--color-info-bg)",
    text: "var(--color-info)",
    border: "var(--color-info-bd)",
  },
  RESET_REQUIRED: {
    label: "Requiere reseteo",
    icon: RefreshCw,
    bg: "var(--color-warning-bg)",
    text: "var(--color-warning)",
    border: "var(--color-warning-bd)",
  },
  EXTERNAL_PROVIDER: {
    label: "Proveedor externo",
    icon: Link2,
    bg: "var(--color-info-bg)",
    text: "var(--color-info)",
    border: "var(--color-info-bd)",
  },
};

function StatusBadge({ status }: { status: CognitoStatus }): React.JSX.Element {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    icon: HelpCircle,
    bg: "var(--bg-muted)",
    text: "var(--tx-muted)",
    border: "var(--bd-default)",
  };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {cfg.label}
    </span>
  );
}

interface UserCardProps {
  user: CognitoUser;
  onDisable: () => void;
  onEnable: () => void;
  onDelete: () => void;
  onResend?: () => void;
  resending?: boolean;
}

const GROUP_ICONS: Record<UserGroup, typeof Shield> = {
  admin: ShieldCheck,
  receptionist: ShieldBan,
  staff: ShieldAlert,
  student: Shield,
};

export function UserCard({
  user,
  onDisable,
  onEnable,
  onDelete,
  onResend,
  resending,
}: UserCardProps): React.JSX.Element {
  const isDisabled = !user.enabled;
  const primaryGroup = (user.groups[0] ?? "student") as UserGroup;
  const GroupIcon = GROUP_ICONS[primaryGroup] ?? Shield;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
        isDisabled
          ? "border-red-500/20 bg-red-500/5 opacity-60"
          : "border-[--bd-default] bg-[--bg-surface] hover:border-[--bd-subtle]"
      }`}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[--bg-muted]">
        <GroupIcon className="h-6 w-6 text-[--tx-muted]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="truncate text-sm font-semibold text-[--tx-primary]">
            {user.name || "Sin nombre"}
          </p>
          {user.groups.map((g) => (
            <span
              key={g}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${USER_GROUP_COLORS[g as UserGroup] ?? "bg-[--bg-muted] text-[--tx-muted]"}`}
            >
              {USER_GROUP_LABELS[g as UserGroup] ?? g}
            </span>
          ))}
          {isDisabled && (
            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400 border border-red-500/20">
              Deshabilitado
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[--tx-muted]">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0" />
            {user.email}
          </span>
          <StatusBadge status={user.status} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onResend && !isDisabled && (
          <button
            onClick={onResend}
            disabled={resending}
            title="Reenviar invitación (resetea contraseña temporal)"
            className="rounded-lg p-2 text-[--gold] hover:bg-[--gold-bg] transition-colors disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        )}
        {isDisabled ? (
          <button
            onClick={onEnable}
            title="Habilitar"
            className="rounded-lg p-2 text-[--color-success] hover:bg-[--color-success-bg] transition-colors"
          >
            <UserCheck className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onDisable}
            title="Deshabilitar"
            className="rounded-lg p-2 text-[--color-warning] hover:bg-[--color-warning-bg] transition-colors"
          >
            <UserX className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          title="Eliminar"
          className="rounded-lg p-2 text-[--color-danger] hover:bg-[--color-danger-bg] transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
