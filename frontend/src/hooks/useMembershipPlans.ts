/** TanStack Query hooks for the Membership Plans module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { membershipPlanService } from "@/services/membershipPlanService";
import type {
  CreatePlanRequest,
  MembershipPlan,
  UpdatePlanRequest,
} from "@/types/membershipPlan";
import { getApiErrorMessage } from "@/lib/apiError";

export const PLANS_KEY = "membership-plans";

// ── Queries ─────────────────────────────────────────────────────────────────

export function useMembershipPlans(includeInactive = false) {
  return useQuery<MembershipPlan[]>({
    queryKey: [PLANS_KEY, { includeInactive }],
    queryFn: () => membershipPlanService.list(includeInactive),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMembershipPlan(slug: string) {
  return useQuery<MembershipPlan>({
    queryKey: [PLANS_KEY, slug],
    queryFn: () => membershipPlanService.get(slug),
    enabled: !!slug,
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanRequest) =>
      membershipPlanService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLANS_KEY] });
      toast.success("Plan creado exitosamente.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al crear plan."));
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      data,
    }: {
      slug: string;
      data: UpdatePlanRequest;
    }) => membershipPlanService.update(slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLANS_KEY] });
      toast.success("Plan actualizado.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al actualizar plan."));
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => membershipPlanService.remove(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLANS_KEY] });
      toast.success("Plan desactivado.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al desactivar plan."));
    },
  });
}

export function useSeedPlans() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => membershipPlanService.seed(),
    onSuccess: (plans) => {
      qc.invalidateQueries({ queryKey: [PLANS_KEY] });
      toast.success(`${plans.length} planes inicializados.`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al inicializar planes."));
    },
  });
}
