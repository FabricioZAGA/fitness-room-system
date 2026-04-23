/** Users management page — list, create, disable Cognito users (admin only). */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Plus, Shield } from "lucide-react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterTabs } from "@/components/shared/FilterTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserCard } from "@/components/shared/UserCard";
import { CreateUserModal } from "@/components/shared/CreateUserModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  useUsers,
  useDisableUser,
  useEnableUser,
  useDeleteUser,
} from "@/hooks/useUsers";
import {
  USER_GROUP_FILTER_OPTIONS,
  USER_GROUP_LABELS,
  USER_GROUPS,
  type UserGroup,
} from "@/lib/userGroups";
import type { CognitoUser } from "@/services/userService";

export const Route = createFileRoute("/users/")({
  component: UsersPage,
});

type GroupFilterValue = UserGroup | "all";

const FILTER_OPTIONS = USER_GROUP_FILTER_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value as GroupFilterValue,
}));

function UsersPage(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<GroupFilterValue>("all");
  const [confirmAction, setConfirmAction] = useState<{
    type: "disable" | "delete";
    user: CognitoUser;
  } | null>(null);

  const { data: users, isLoading } = useUsers();
  const { mutate: disableUser } = useDisableUser();
  const { mutate: enableUser } = useEnableUser();
  const { mutate: deleteUser } = useDeleteUser();

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q);
    const matchesGroup =
      groupFilter === "all" || u.groups.includes(groupFilter);
    return matchesSearch && matchesGroup;
  });

  const counts = USER_GROUPS.reduce(
    (acc, g) => {
      acc[g] = (users ?? []).filter((u) => u.groups.includes(g)).length;
      return acc;
    },
    {} as Record<UserGroup, number>,
  );

  const subtitle = [
    `${users?.length ?? 0} usuarios`,
    ...USER_GROUPS.map((g) => `${counts[g]} ${USER_GROUP_LABELS[g].toLowerCase()}`),
  ].join(" · ");

  return (
    <PageWrapper>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={subtitle}
        action={{ label: "Nuevo Usuario", icon: Plus, onClick: () => setCreateOpen(true) }}
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o email..."
        />
        <FilterTabs<GroupFilterValue>
          options={FILTER_OPTIONS}
          value={groupFilter}
          onChange={setGroupFilter}
        />
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[--gold]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} message="No se encontraron usuarios" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((user) => (
            <UserCard
              key={user.username}
              user={user}
              onDisable={() => setConfirmAction({ type: "disable", user })}
              onEnable={() => enableUser(user.username)}
              onDelete={() => setConfirmAction({ type: "delete", user })}
            />
          ))}
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Confirm disable */}
      <ConfirmDialog
        open={confirmAction?.type === "disable"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.user) disableUser(confirmAction.user.username);
          setConfirmAction(null);
        }}
        title="Deshabilitar usuario"
        description={`¿Deseas deshabilitar a ${confirmAction?.user.name || confirmAction?.user.email}? No podrá iniciar sesión.`}
        confirmLabel="Deshabilitar"
        variant="warning"
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.user) deleteUser(confirmAction.user.username);
          setConfirmAction(null);
        }}
        title="Eliminar usuario"
        description={`¿ELIMINAR PERMANENTEMENTE a ${confirmAction?.user.name || confirmAction?.user.email}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </PageWrapper>
  );
}
