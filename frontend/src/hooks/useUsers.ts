/** TanStack Query hooks for Cognito user management. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  userService,
  type CognitoUser,
  type CreateUserRequest,
} from "@/services/userService";
import { getApiErrorMessage } from "@/lib/apiError";

export const USERS_KEY = "cognito-users";

export function useUsers(): UseQueryResult<CognitoUser[]> {
  return useQuery({
    queryKey: [USERS_KEY, "list"],
    queryFn: () => userService.list(),
  });
}

export function useCreateUser(): UseMutationResult<CognitoUser, unknown, CreateUserRequest> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => userService.create(data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      const status = user.email_delivery_status;
      if (status === "sent") {
        toast.success(`Usuario creado — correo enviado a ${user.email}`);
      } else if (status === "suppressed") {
        toast.warning(
          `Usuario creado pero el correo no se pudo entregar: la dirección ${user.email} ` +
            `está en la lista de supresión de SES por un rebote previo. ` +
            `Verifica la dirección o usa "Reenviar invitación" tras corregirla.`,
          {
            duration: 15000,
            action: {
              label: "Ver supresiones",
              onClick: () => {
                window.location.href = "/settings#email-health";
              },
            },
          },
        );
      } else if (status === "failed") {
        toast.warning(
          `Usuario creado pero el correo falló: ${user.email_delivery_detail ?? "error desconocido"}. ` +
            `Usa el botón "Reenviar invitación" para reintentar.`,
          { duration: 12000 },
        );
      } else {
        toast.success("Usuario creado exitosamente");
      }
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, "Error al crear usuario"));
    },
  });
}

export function useUpdateUserGroups(username: string): UseMutationResult<CognitoUser, Error, string[]> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groups: string[]) => userService.updateGroups(username, groups),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("Grupos actualizados");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });
}

export function useDisableUser(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => userService.disable(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("Usuario deshabilitado");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });
}

export function useEnableUser(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => userService.enable(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("Usuario habilitado");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });
}

export function useDeleteUser(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => userService.delete(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("Usuario eliminado");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });
}

export function useResendInvite(): UseMutationResult<CognitoUser, unknown, { username: string; skipPasswordChange?: boolean }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, skipPasswordChange }: { username: string; skipPasswordChange?: boolean }) =>
      userService.resendInvite(username, skipPasswordChange),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      const status = user.email_delivery_status;
      if (status === "sent") {
        toast.success(`Nueva contraseña enviada a ${user.email}`);
      } else if (status === "suppressed") {
        toast.error(
          `El correo de ${user.email} está en la lista de supresión de SES (rebote previo). ` +
            `Verifica que la dirección sea correcta o contacta al usuario por otro medio.`,
          {
            duration: 15000,
            action: {
              label: "Ver supresiones",
              onClick: () => {
                window.location.href = "/settings#email-health";
              },
            },
          },
        );
      } else {
        toast.error(
          `Usuario reinvitado pero el correo falló: ${user.email_delivery_detail ?? "error desconocido"}`,
          { duration: 10000 },
        );
      }
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, "Error al reenviar invitación"));
    },
  });
}
