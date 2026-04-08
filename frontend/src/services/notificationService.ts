/** Notifications API service. */

import type {
  BulkNotificationResult,
  NotificationResponse,
  SendBulkRequest,
  SendCustomRequest,
} from "@/types/notification";
import { apiClient } from "./apiClient";

export const notificationService = {
  async sendExpiryReminders(params?: SendBulkRequest): Promise<BulkNotificationResult> {
    const res = await apiClient.post<BulkNotificationResult>(
      "/notifications/send-expiry-reminders",
      params ?? {}
    );
    return res.data;
  },

  async sendInactivityAlerts(params?: SendBulkRequest): Promise<BulkNotificationResult> {
    const res = await apiClient.post<BulkNotificationResult>(
      "/notifications/send-inactivity-alerts",
      params ?? {}
    );
    return res.data;
  },

  async sendCustom(studentId: string, data: SendCustomRequest): Promise<NotificationResponse> {
    const res = await apiClient.post<NotificationResponse>(
      `/notifications/student/${studentId}`,
      data
    );
    return res.data;
  },

  async listRecent(limit = 50): Promise<NotificationResponse[]> {
    const res = await apiClient.get<NotificationResponse[]>("/notifications", {
      params: { limit },
    });
    return res.data;
  },
} as const;
