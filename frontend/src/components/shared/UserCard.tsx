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
} from "lucide-react";
import type { CognitoUser } from "@/services/userService";
import { USER_GROUP_LABELS, USER_GROUP_COLORS, type UserGroup } from "@/lib/userGroups";

interface UserCardProps {
  user: CognitoUser;
  onDisable: () => void;
  onEnable: () => void;
  onDelete: () => void;
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
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[--tx-muted]">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {user.email}
          </span>
          <span>Estado: {user.status}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
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
