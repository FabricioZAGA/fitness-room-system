/** TanStack Query hooks for the Classes module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassAttendees, CreateClassRequest, FitnessClass, UpdateClassRequest } from "@/types/class";
import { classService } from "@/services/classService";

export const CLASSES_KEY = "classes";

export function useClasses(params?: {
  date?: string;
  start_date?: string;
  end_date?: string;
  upcoming_only?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: [CLASSES_KEY, "list", params],
    queryFn: () => classService.list(params),
  });
}

export function useClass(classId: string) {
  return useQuery({
    queryKey: [CLASSES_KEY, classId],
    queryFn: () => classService.getById(classId),
    enabled: Boolean(classId),
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClassRequest) => classService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      toast.success("Clase creada exitosamente.");
    },
    onError: () => {
      toast.error("Error al crear la clase.");
    },
  });
}

export function useUpdateClass(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateClassRequest) => classService.update(classId, data),
    onSuccess: (updatedClass: FitnessClass) => {
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      qc.setQueryData([CLASSES_KEY, classId], updatedClass);
      toast.success("Clase actualizada.");
    },
    onError: () => {
      toast.error("Error al actualizar la clase.");
    },
  });
}

export function useCancelClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => classService.cancel(classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      toast.success("Clase cancelada.");
    },
    onError: () => {
      toast.error("Error al cancelar la clase.");
    },
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => classService.delete(classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      toast.success("Clase eliminada.");
    },
  });
}

export function useClassAttendees(classId: string | null) {
  return useQuery<ClassAttendees>({
    queryKey: [CLASSES_KEY, "attendees", classId],
    queryFn: () => classService.getAttendees(classId!),
    enabled: Boolean(classId),
  });
}
