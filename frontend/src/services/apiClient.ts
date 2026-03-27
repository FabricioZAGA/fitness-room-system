/**
 * Axios API client configured for Fitness Room backend.
 * Automatically attaches Cognito JWT from Amplify session on every request.
 */

import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

const IS_LOCAL = import.meta.env.VITE_APP_ENV === "local";

apiClient.interceptors.request.use(async (config) => {
  if (IS_LOCAL) {
    config.headers.Authorization = "Bearer local-dev-token";
    return config;
  }
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // No active session — request will be rejected by API Gateway authorizer
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);
