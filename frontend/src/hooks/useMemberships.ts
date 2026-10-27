/** TanStack Query hooks for the Memberships module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateMembershipRequest,
  FreezeMembershipRequest,
  MembershipStatusFilter,
  UpdateMembershipRequest,
} from "@/types/membership";
import { membershipService } from "@/services/membershipService";
import { getApiErrorMessage } from "@/lib/apiError";

export const MEMBERSHIPS_KEY = "memberships";

export function useMembershipsForStudent(studentId: string, limit?: number) {
  return useQuery({
    queryKey: [MEMBERSHIPS_KEY, "student", studentId, limit],
    queryFn: () => membershipService.listForStudent(studentId, limit ? { limit } : undefined),
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
  status_filter?: MembershipStatusFilter;
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
    onSuccess: (membership) => {
      qc.invalidateQueries({ queryKey: [MEMBERSHIPS_KEY] });
      // Backend settles the payment (transaction / balance / debt) — sync Caja view
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
      toast.success(
        membership.status === "pending"
          ? `Renovación programada: inicia el ${membership.start_date}.`
          : "Membresía asignada exitosamente."
      );
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al asignar la membresía."));
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al actualizar la membresía."));
    },
  });
}

export function useLapsedStudents() {
  return useQuery({
    queryKey: [MEMBERSHIPS_KEY, "lapsed"],
    queryFn: () => membershipService.listLapsed(),
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
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Error al congelar la membresía.")),
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
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Error al reactivar la membresía.")),
  });
}
