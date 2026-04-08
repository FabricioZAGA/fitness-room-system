/** Stats API service — dashboard metrics endpoint. */

import type { FitnessClass } from "@/types/class";
import type { Membership } from "@/types/membership";
import { apiClient } from "./apiClient";

export interface DashboardStats {
  active_students: number;
  today_classes: number;
  active_instructors: number;
  expiring_memberships_7d: number;
  upcoming_classes: FitnessClass[];
  expiring_memberships: MembershipWithStudent[];
}

export interface MembershipWithStudent extends Membership {
  student_name: string;
}

export const statsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>("/stats");
    return response.data;
  },
} as const;
