/** Cognito user group definitions — labels, colors, and filter options.
 *
 * Single source of truth for all user-group UI across the app.
 */

export type UserGroup = "admin" | "receptionist" | "staff" | "student";

export const USER_GROUPS: readonly UserGroup[] = [
  "admin",
  "receptionist",
  "staff",
  "student",
] as const;

export const USER_GROUP_LABELS: Record<UserGroup, string> = {
  admin: "Administrador",
  receptionist: "Recepcionista",
  staff: "Staff / Instructor",
  student: "Alumno",
};

export const USER_GROUP_COLORS: Record<UserGroup, string> = {
  admin: "bg-[--gold-bg] text-[--gold] border border-[--gold-bd]",
  receptionist: "bg-[--color-warning-bg] text-[--color-warning] border border-[--color-warning-bd]",
  staff: "bg-[--color-info-bg] text-[--color-info] border border-[--color-info-bd]",
  student: "bg-[--color-success-bg] text-[--color-success] border border-[--color-success-bd]",
};

export interface UserGroupFilterOption {
  label: string;
  value: UserGroup | "all";
}

export const USER_GROUP_FILTER_OPTIONS: UserGroupFilterOption[] = [
  { label: "Todos", value: "all" },
  { label: "Administrador", value: "admin" },
  { label: "Recepcionista", value: "receptionist" },
  { label: "Staff / Instructor", value: "staff" },
  { label: "Alumno", value: "student" },
];

export const CREATE_USER_GROUP_OPTIONS: { value: UserGroup; label: string }[] = [
  { value: "admin", label: "Administrador — acceso completo" },
  { value: "receptionist", label: "Recepcionista — acceso limitado al panel" },
  { value: "staff", label: "Staff / Instructor — portal de instructor" },
  { value: "student", label: "Alumno — solo portal de alumno" },
];
