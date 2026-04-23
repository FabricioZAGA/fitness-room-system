/** TanStack Query hooks for instructor operations. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { instructorService } from "@/services/instructorService";
import { getApiErrorMessage } from "@/lib/apiError";
import type {
  CreateInstructorRequest,
  UpdateInstructorRequest,
  InstructorStatus,
} from "@/types/instructor";

const QUERY_KEY = "instructors";

export function useInstructors(params?: {
  status?: InstructorStatus;
  limit?: number;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => instructorService.list(params),
    staleTime: 1000 * 60 * 5, // 5 min — instructors rarely change
  });
}

export function useInstructor(instructorId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, instructorId],
    queryFn: () => instructorService.getById(instructorId),
    enabled: !!instructorId,
  });
}

export function useCreateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInstructorRequest) => instructorService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Instructor registrado correctamente");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al registrar instructor"));
    },
  });
}

export function useUpdateInstructor(instructorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateInstructorRequest) =>
      instructorService.update(instructorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Instructor actualizado correctamente");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al actualizar instructor"));
    },
  });
}

export function useActivateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instructorId: string) => instructorService.activate(instructorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Instructor activado");
    },
    onError: () => {
      toast.error("Error al activar instructor");
    },
  });
}

export function useDeactivateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instructorId: string) => instructorService.deactivate(instructorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Instructor desactivado");
    },
    onError: () => {
      toast.error("Error al desactivar instructor");
    },
  });
}

export function useDeleteInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instructorId: string) => instructorService.delete(instructorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Instructor eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar instructor");
    },
  });
}
