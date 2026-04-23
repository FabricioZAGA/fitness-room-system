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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("Usuario creado exitosamente");
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
