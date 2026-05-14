/** TanStack Query hooks for the Memberships module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateMembershipRequest,
  FreezeMembershipRequest,
  UpdateMembershipRequest,
} from "@/types/membership";
import { membershipService } from "@/services/membershipService";

export const MEMBERSHIPS_KEY = "memberships";

export function useMembershipsForStudent(studentId: string) {
  return useQuery({
    queryKey: [MEMBERSHIPS_KEY, "student", studentId],
    queryFn: () => membershipService.listForStudent(studentId),
    enabled: Boolean(studentId),
  });
}

export function useActiveMembership(studentId: string) {
  return useQuery({
    queryKey: [MEMBERSHIPS_KEY, "active", studentId],
    queryFn: () => membershipService.getActive(studentId),
    enabled: Boolean(studentId),
  });
}

export function useExpiringSoon(days: number = 7) {
  return useQuery({
    queryKey: [MEMBERSHIPS_KEY, "expiring", days],
    queryFn: () => membershipService.listExpiringSoon(days),
  });
}

export function useAllMemberships(params?: {
  status_filter?: "active" | "frozen" | "expired" | "cancelled";
  limit?: number;
}) {
  return useQuery({
    queryKey: [MEMBERSHIPS_KEY, "all", params],
    queryFn: () => membershipService.listAll(params),
  });
}

export function useAssignMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMembershipRequest) => membershipService.assign(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MEMBERSHIPS_KEY] });
      // Backend auto-creates a transaction — sync Caja view
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Membresía asignada exitosamente.");
    },
    onError: () => {
      toast.error("Error al asignar la membresía.");
    },
  });
}

export function useUpdateMembership(studentId: string, membershipId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMembershipRequest) =>
      membershipService.update(studentId, membershipId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MEMBERSHIPS_KEY] });
      toast.success("Membresía actualizada.");
    },
    onError: () => {
      toast.error("Error al actualizar la membresía.");
    },
  });
}

export function useCancelMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, membershipId }: { studentId: string; membershipId: string }) =>
      membershipService.cancel(studentId, membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MEMBERSHIPS_KEY] });
      toast.success("Membresía cancelada.");
    },
    onError: () => {
      toast.error("Error al cancelar la membresía.");
    },
  });
}

export function useFreezeMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      membershipId,
      data,
    }: {
      studentId: string;
      membershipId: string;
      data: FreezeMembershipRequest;
    }) => membershipService.freeze(studentId, membershipId, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [MEMBERSHIPS_KEY] });
      toast.success(
        `Membresía congelada ${result.frozen_days_accumulated} días. Nueva fecha de vencimiento: ${result.end_date}`
      );
    },
    onError: () => toast.error("Error al congelar la membresía."),
  });
}

export function useUnfreezeMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, membershipId }: { studentId: string; membershipId: string }) =>
      membershipService.unfreeze(studentId, membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MEMBERSHIPS_KEY] });
      toast.success("Membresía reactivada exitosamente.");
    },
    onError: () => toast.error("Error al reactivar la membresía."),
  });
}
