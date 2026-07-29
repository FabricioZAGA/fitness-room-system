/** Balance API service. */

import type {
  ApplyBalanceRequest,
  BalanceMovement,
  DepositRequest,
  StudentBalance,
} from "@/types/balance";
import { apiClient } from "./apiClient";

export const balanceService = {
  async getBalance(studentId: string): Promise<StudentBalance> {
    const res = await apiClient.get<StudentBalance>(`/balance/${studentId}`);
    return res.data;
  },

  async deposit(
    studentId: string,
    data: DepositRequest
  ): Promise<BalanceMovement> {
    const res = await apiClient.post<BalanceMovement>(
      `/balance/${studentId}/deposit`,
      data
    );
    return res.data;
  },

  async applyToMembership(
    studentId: string,
    data: ApplyBalanceRequest
  ): Promise<BalanceMovement> {
    const res = await apiClient.post<BalanceMovement>(
      `/balance/${studentId}/apply`,
      data
    );
    return res.data;
  },

  async listMovements(
    studentId: string,
    limit = 50
  ): Promise<BalanceMovement[]> {
    const res = await apiClient.get<BalanceMovement[]>(
      `/balance/${studentId}/movements`,
      { params: { limit } }
    );
    return res.data;
  },
};
