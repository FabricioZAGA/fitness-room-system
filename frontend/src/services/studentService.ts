/** Student API service — all HTTP calls for the Students module. */

import type { PaginatedResponse } from "@/types/common";
import type {
  CreateStudentRequest,
  Student,
  StudentStatus,
  UpdateStudentRequest,
} from "@/types/student";
import { apiClient } from "./apiClient";

export const studentService = {
  async create(data: CreateStudentRequest): Promise<Student> {
    const response = await apiClient.post<Student>("/students", data);
    return response.data;
  },

  async getById(studentId: string): Promise<Student> {
    const response = await apiClient.get<Student>(`/students/${studentId}`);
    return response.data;
  },

  async list(params?: {
    status?: StudentStatus;
    limit?: number;
    last_key?: string;
  }): Promise<PaginatedResponse<Student>> {
    const response = await apiClient.get<PaginatedResponse<Student>>("/students", {
      params,
    });
    return response.data;
  },

  async update(studentId: string, data: UpdateStudentRequest): Promise<Student> {
    const response = await apiClient.patch<Student>(`/students/${studentId}`, data);
    return response.data;
  },

  async activate(studentId: string): Promise<Student> {
    const response = await apiClient.post<Student>(`/students/${studentId}/activate`);
    return response.data;
  },

  async deactivate(studentId: string): Promise<Student> {
    const response = await apiClient.post<Student>(`/students/${studentId}/deactivate`);
    return response.data;
  },

  async delete(studentId: string): Promise<void> {
    await apiClient.delete(`/students/${studentId}`);
  },

  /** Record a gym entry check-in for a student. Requires backend POST /students/:id/checkin */
  async checkin(studentId: string): Promise<{ checked_in_at: string }> {
    const response = await apiClient.post<{ checked_in_at: string }>(
      `/students/${studentId}/checkin`
    );
    return response.data;
  },
} as const;
