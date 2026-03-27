/** API service for instructor operations. */

import { apiClient } from "./apiClient";
import type { PaginatedResponse } from "@/types/common";
import type {
  Instructor,
  CreateInstructorRequest,
  UpdateInstructorRequest,
  InstructorStatus,
} from "@/types/instructor";

export const instructorService = {
  async list(params?: {
    status?: InstructorStatus;
    limit?: number;
    last_key?: string;
  }): Promise<PaginatedResponse<Instructor>> {
    const response = await apiClient.get<PaginatedResponse<Instructor>>(
      "/instructors",
      { params }
    );
    return response.data;
  },

  async getById(instructorId: string): Promise<Instructor> {
    const response = await apiClient.get<Instructor>(
      `/instructors/${instructorId}`
    );
    return response.data;
  },

  async create(data: CreateInstructorRequest): Promise<Instructor> {
    const response = await apiClient.post<Instructor>("/instructors", data);
    return response.data;
  },

  async update(
    instructorId: string,
    data: UpdateInstructorRequest
  ): Promise<Instructor> {
    const response = await apiClient.patch<Instructor>(
      `/instructors/${instructorId}`,
      data
    );
    return response.data;
  },

  async activate(instructorId: string): Promise<Instructor> {
    const response = await apiClient.post<Instructor>(
      `/instructors/${instructorId}/activate`
    );
    return response.data;
  },

  async deactivate(instructorId: string): Promise<Instructor> {
    const response = await apiClient.post<Instructor>(
      `/instructors/${instructorId}/deactivate`
    );
    return response.data;
  },

  async delete(instructorId: string): Promise<void> {
    await apiClient.delete(`/instructors/${instructorId}`);
  },
};
