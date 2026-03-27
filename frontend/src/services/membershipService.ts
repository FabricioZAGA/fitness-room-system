/** Membership API service — all HTTP calls for the Memberships module. */

import type { PaginatedResponse } from "@/types/common";
import type {
  CreateMembershipRequest,
  Membership,
  UpdateMembershipRequest,
} from "@/types/membership";
import { apiClient } from "./apiClient";

export const membershipService = {
  async assign(data: CreateMembershipRequest): Promise<Membership> {
    const response = await apiClient.post<Membership>("/memberships", data);
    return response.data;
  },

  async getById(studentId: string, membershipId: string): Promise<Membership> {
    const response = await apiClient.get<Membership>(
      `/memberships/student/${studentId}/${membershipId}`
    );
    return response.data;
  },

  async getActive(studentId: string): Promise<Membership | null> {
    const response = await apiClient.get<Membership | null>(
      `/memberships/student/${studentId}/active`
    );
    return response.data;
  },

  async listForStudent(
    studentId: string,
    params?: { limit?: number; last_key?: string }
  ): Promise<PaginatedResponse<Membership>> {
    const response = await apiClient.get<PaginatedResponse<Membership>>(
      `/memberships/student/${studentId}`,
      { params }
    );
    return response.data;
  },

  async listExpiringSoon(days?: number): Promise<Membership[]> {
    const response = await apiClient.get<Membership[]>("/memberships/expiring-soon", {
      params: { days },
    });
    return response.data;
  },

  async update(
    studentId: string,
    membershipId: string,
    data: UpdateMembershipRequest
  ): Promise<Membership> {
    const response = await apiClient.patch<Membership>(
      `/memberships/student/${studentId}/${membershipId}`,
      data
    );
    return response.data;
  },

  async cancel(studentId: string, membershipId: string): Promise<Membership> {
    const response = await apiClient.post<Membership>(
      `/memberships/student/${studentId}/${membershipId}/cancel`
    );
    return response.data;
  },
} as const;
