/** TanStack Query hooks for the Transactions module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  CashCut,
  CreateCashCutRequest,
  CreateTransactionRequest,
  TodaySummary,
  Transaction,
} from "@/types/transaction";
import { transactionService } from "@/services/transactionService";

export const TX_KEY = "transactions";
export const CASHCUT_KEY = "cashcuts";

export function useTodaySummary(): UseQueryResult<TodaySummary> {
  return useQuery({
    queryKey: [TX_KEY, "today"],
    queryFn: () => transactionService.todaySummary(),
    refetchInterval: 1000 * 60 * 2, // refresh every 2 min
  });
}

export function useTransactionsByDate(date?: string): UseQueryResult<Transaction[]> {
  return useQuery({
    queryKey: [TX_KEY, "byDate", date],
    queryFn: () => transactionService.listByDate(date),
  });
}

export function useCashCuts(): UseQueryResult<CashCut[]> {
  return useQuery({
    queryKey: [CASHCUT_KEY, "list"],
    queryFn: () => transactionService.listCashCuts(),
  });
}

export function useCashCut(cutId: string): UseQueryResult<CashCut> {
  return useQuery({
    queryKey: [CASHCUT_KEY, cutId],
    queryFn: () => transactionService.getCashCut(cutId),
    enabled: !!cutId,
  });
}

export function useRecordTransaction(): UseMutationResult<
  Transaction,
  Error,
  CreateTransactionRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => transactionService.record(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}

export function useCreateCashCut(): UseMutationResult<
  CashCut,
  Error,
  CreateCashCutRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => transactionService.createCashCut(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CASHCUT_KEY] });
      void qc.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}
