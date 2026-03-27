/** Reservation API service — all HTTP calls for the Reservations module. */

import type { PaginatedResponse } from "@/types/common";
import type { CreateReservationRequest, Reservation } from "@/types/reservation";
import { apiClient } from "./apiClient";

export const reservationService = {
  async create(data: CreateReservationRequest): Promise<Reservation> {
    const response = await apiClient.post<Reservation>("/reservations", data);
    return response.data;
  },

  async listForClass(
    classId: string,
    params?: { limit?: number; last_key?: string }
  ): Promise<PaginatedResponse<Reservation>> {
    const response = await apiClient.get<PaginatedResponse<Reservation>>(
      `/reservations/class/${classId}`,
      { params }
    );
    return response.data;
  },

  async getWaitlistForClass(classId: string): Promise<Reservation[]> {
    const response = await apiClient.get<Reservation[]>(
      `/reservations/class/${classId}/waitlist`
    );
    return response.data;
  },

  async listForStudent(
    studentId: string,
    params?: { limit?: number; last_key?: string }
  ): Promise<PaginatedResponse<Reservation>> {
    const response = await apiClient.get<PaginatedResponse<Reservation>>(
      `/reservations/student/${studentId}`,
      { params }
    );
    return response.data;
  },

  async cancel(classId: string, studentId: string): Promise<Reservation> {
    const response = await apiClient.delete<Reservation>(
      `/reservations/class/${classId}/student/${studentId}`
    );
    return response.data;
  },

  async markAttendance(
    classId: string,
    studentId: string,
    attended: boolean
  ): Promise<Reservation> {
    const response = await apiClient.post<Reservation>(
      `/reservations/class/${classId}/student/${studentId}/attendance`,
      null,
      { params: { attended } }
    );
    return response.data;
  },
} as const;
