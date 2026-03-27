/** Class API service — all HTTP calls for the Classes module. */

import type { PaginatedResponse } from "@/types/common";
import type { CreateClassRequest, FitnessClass, UpdateClassRequest } from "@/types/class";
import { apiClient } from "./apiClient";

export const classService = {
  async create(data: CreateClassRequest): Promise<FitnessClass> {
    const response = await apiClient.post<FitnessClass>("/classes", data);
    return response.data;
  },

  async getById(classId: string): Promise<FitnessClass> {
    const response = await apiClient.get<FitnessClass>(`/classes/${classId}`);
    return response.data;
  },

  async list(params?: {
    date?: string;
    start_date?: string;
    end_date?: string;
    upcoming_only?: boolean;
    limit?: number;
    last_key?: string;
  }): Promise<PaginatedResponse<FitnessClass>> {
    const response = await apiClient.get<PaginatedResponse<FitnessClass>>("/classes", {
      params,
    });
    return response.data;
  },

  async update(classId: string, data: UpdateClassRequest): Promise<FitnessClass> {
    const response = await apiClient.patch<FitnessClass>(`/classes/${classId}`, data);
    return response.data;
  },

  async cancel(classId: string): Promise<FitnessClass> {
    const response = await apiClient.post<FitnessClass>(`/classes/${classId}/cancel`);
    return response.data;
  },

  async delete(classId: string): Promise<void> {
    await apiClient.delete(`/classes/${classId}`);
  },
} as const;
