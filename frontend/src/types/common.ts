/** Common shared TypeScript types for Fitness Room System. */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  last_evaluated_key: string | null;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}
