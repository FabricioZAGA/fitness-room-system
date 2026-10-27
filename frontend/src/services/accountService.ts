/** Account statement API service. */

import type { StudentAccount } from "@/types/account";
import { apiClient } from "./apiClient";

export const accountService = {
  async getStatement(studentId: string): Promise<StudentAccount> {
    const res = await apiClient.get<StudentAccount>(`/students/${studentId}/account`);
    return res.data;
  },
} as const;
