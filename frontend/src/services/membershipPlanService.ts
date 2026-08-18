/** Membership Plan API service — CRUD for admin-configurable plans. */

import type {
  CreatePlanRequest,
  MembershipPlan,
  UpdatePlanRequest,
} from "@/types/membershipPlan";
import { apiClient } from "./apiClient";

export const membershipPlanService = {
  async list(includeInactive = false): Promise<MembershipPlan[]> {
    const response = await apiClient.get<MembershipPlan[]>(
      "/membership-plans",
      { params: { include_inactive: includeInactive } },
    );
    return response.data;
  },

  async get(slug: string): Promise<MembershipPlan> {
    const response = await apiClient.get<MembershipPlan>(
      `/membership-plans/${slug}`,
    );
    return response.data;
  },

  async create(data: CreatePlanRequest): Promise<MembershipPlan> {
    const response = await apiClient.post<MembershipPlan>(
      "/membership-plans",
      data,
    );
    return response.data;
  },

  async update(
    slug: string,
    data: UpdatePlanRequest,
  ): Promise<MembershipPlan> {
    const response = await apiClient.patch<MembershipPlan>(
      `/membership-plans/${slug}`,
      data,
    );
    return response.data;
  },

  async remove(slug: string): Promise<void> {
    await apiClient.delete(`/membership-plans/${slug}`);
  },

  async seed(): Promise<MembershipPlan[]> {
    const response = await apiClient.post<MembershipPlan[]>(
      "/membership-plans/seed",
    );
    return response.data;
  },
} as const;
