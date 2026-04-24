/** Cognito User management API service. */

import { apiClient } from "./apiClient";

export interface CognitoUser {
  username: string;
  email: string;
  name: string;
  status: string;
  enabled: boolean;
  groups: string[];
  created_at: string;
  /** Present only on create / resend-invite. "sent" | "suppressed" | "failed". */
  email_delivery_status?: string | null;
  email_delivery_detail?: string | null;
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  group: string;
}

export interface UpdateUserGroupsRequest {
  groups: string[];
}

export const userService = {
  async list(): Promise<CognitoUser[]> {
    const response = await apiClient.get<CognitoUser[]>("/users");
    return response.data;
  },

  async getByUsername(username: string): Promise<CognitoUser> {
    const response = await apiClient.get<CognitoUser>(`/users/${encodeURIComponent(username)}`);
    return response.data;
  },

  async create(data: CreateUserRequest): Promise<CognitoUser> {
    const response = await apiClient.post<CognitoUser>("/users", data);
    return response.data;
  },

  async updateGroups(username: string, groups: string[]): Promise<CognitoUser> {
    const response = await apiClient.patch<CognitoUser>(
      `/users/${encodeURIComponent(username)}/groups`,
      { groups }
    );
    return response.data;
  },

  async disable(username: string): Promise<void> {
    await apiClient.post(`/users/${encodeURIComponent(username)}/disable`);
  },

  async enable(username: string): Promise<void> {
    await apiClient.post(`/users/${encodeURIComponent(username)}/enable`);
  },

  async delete(username: string): Promise<void> {
    await apiClient.delete(`/users/${encodeURIComponent(username)}`);
  },

  async resendInvite(username: string): Promise<CognitoUser> {
    const response = await apiClient.post<CognitoUser>(
      `/users/${encodeURIComponent(username)}/resend-invite`,
    );
    return response.data;
  },
};
