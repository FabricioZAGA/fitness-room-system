/** TanStack Query hooks for the Reservations module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateReservationRequest } from "@/types/reservation";
import { reservationService } from "@/services/reservationService";
import { getApiErrorMessage } from "@/lib/apiError";
import { CLASSES_KEY } from "@/hooks/useClasses";

export const RESERVATIONS_KEY = "reservations";

export function useReservationsForClass(classId: string) {
  return useQuery({
    queryKey: [RESERVATIONS_KEY, "class", classId],
    queryFn: () => reservationService.listForClass(classId),
    enabled: Boolean(classId),
  });
}

export function useWaitlistForClass(classId: string) {
  return useQuery({
    queryKey: [RESERVATIONS_KEY, "waitlist", classId],
    queryFn: () => reservationService.getWaitlistForClass(classId),
    enabled: Boolean(classId),
  });
}

export function useReservationsForStudent(studentId: string) {
  return useQuery({
    queryKey: [RESERVATIONS_KEY, "student", studentId],
    queryFn: () => reservationService.listForStudent(studentId),
    enabled: Boolean(studentId),
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReservationRequest) => reservationService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] });
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      if (res.status === "confirmed") {
        toast.success("Reservación confirmada.");
      } else {
        toast.info(`Añadido a lista de espera — posición ${res.waitlist_position}.`);
      }
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al crear la reservación."));
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, studentId }: { classId: string; studentId: string }) =>
      reservationService.cancel(classId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] });
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      toast.success("Reservación cancelada.");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al cancelar la reservación."));
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      classId,
      studentId,
      attended,
    }: {
      classId: string;
      studentId: string;
      attended: boolean;
    }) => reservationService.markAttendance(classId, studentId, attended),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] });
      qc.invalidateQueries({ queryKey: [CLASSES_KEY] });
      toast.success(vars.attended ? "Asistencia registrada." : "No-show registrado.");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al registrar asistencia."));
    },
  });
}
