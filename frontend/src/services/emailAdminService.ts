/** Admin endpoints for SES suppression list management. */

import { apiClient } from "./apiClient";

export interface SuppressedEntry {
  email: string;
  reason: string;
  last_update_time: string;
}

export interface SuppressionListResponse {
  items: SuppressedEntry[];
  count: number;
}

export const emailAdminService = {
  async listSuppressions(limit = 200): Promise<SuppressionListResponse> {
    const response = await apiClient.get<SuppressionListResponse>(
      "/email-admin/suppressions",
      { params: { limit } },
    );
    return response.data;
  },

  async deleteSuppression(email: string): Promise<void> {
    await apiClient.delete(
      `/email-admin/suppressions/${encodeURIComponent(email)}`,
    );
  },
};
