/** Debt API service. */

import type { PayDebtRequest, StudentDebt } from "@/types/debt";
import { apiClient } from "./apiClient";

export const debtService = {
  async listForStudent(studentId: string): Promise<StudentDebt[]> {
    const res = await apiClient.get<StudentDebt[]>(
      `/debts/student/${studentId}`
    );
    return res.data;
  },

  async listAllPending(limit = 200): Promise<StudentDebt[]> {
    const res = await apiClient.get<StudentDebt[]>("/debts/pending", {
      params: { limit },
    });
    return res.data;
  },

  async payDebt(
    studentId: string,
    saleId: string,
    data: PayDebtRequest
  ): Promise<StudentDebt> {
    const res = await apiClient.post<StudentDebt>(
      `/debts/student/${studentId}/${saleId}/pay`,
      data
    );
    return res.data;
  },

  async payAllDebts(
    studentId: string,
    data: PayDebtRequest
  ): Promise<StudentDebt[]> {
    const res = await apiClient.post<StudentDebt[]>(
      `/debts/student/${studentId}/pay-all`,
      data
    );
    return res.data;
  },
};
