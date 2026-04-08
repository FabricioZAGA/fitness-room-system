/** Transaction API service. */

import type {
  CashCut,
  CreateCashCutRequest,
  CreateTransactionRequest,
  TodaySummary,
  Transaction,
} from "@/types/transaction";
import { apiClient } from "./apiClient";

export const transactionService = {
  async record(data: CreateTransactionRequest): Promise<Transaction> {
    const res = await apiClient.post<Transaction>("/transactions", data);
    return res.data;
  },

  async getById(txId: string): Promise<Transaction> {
    const res = await apiClient.get<Transaction>(`/transactions/${txId}`);
    return res.data;
  },

  async listByDate(date?: string): Promise<Transaction[]> {
    const res = await apiClient.get<Transaction[]>("/transactions", {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  async listForStudent(studentId: string): Promise<Transaction[]> {
    const res = await apiClient.get<Transaction[]>(
      `/transactions/student/${studentId}`
    );
    return res.data;
  },

  async todaySummary(): Promise<TodaySummary> {
    const res = await apiClient.get<TodaySummary>("/transactions/summary/today");
    return res.data;
  },

  // Cash cuts
  async createCashCut(data: CreateCashCutRequest): Promise<CashCut> {
    const res = await apiClient.post<CashCut>("/transactions/cashcut", data);
    return res.data;
  },

  async listCashCuts(limit?: number): Promise<CashCut[]> {
    const res = await apiClient.get<CashCut[]>("/transactions/cashcut", {
      params: limit ? { limit } : undefined,
    });
    return res.data;
  },

  async getCashCut(cutId: string): Promise<CashCut> {
    const res = await apiClient.get<CashCut>(`/transactions/cashcut/${cutId}`);
    return res.data;
  },
} as const;
