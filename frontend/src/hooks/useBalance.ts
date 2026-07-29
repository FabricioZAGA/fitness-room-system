/** TanStack Query hooks for the Balance module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  ApplyBalanceRequest,
  BalanceMovement,
  DepositRequest,
  StudentBalance,
} from "@/types/balance";
import { balanceService } from "@/services/balanceService";
import { TX_KEY } from "./useTransactions";

export const BALANCE_KEY = "balance";

export function useStudentBalance(
  studentId: string | undefined
): UseQueryResult<StudentBalance> {
  return useQuery({
    queryKey: [BALANCE_KEY, studentId],
    queryFn: () => balanceService.getBalance(studentId!),
    enabled: !!studentId,
  });
}

export function useBalanceMovements(
  studentId: string | undefined,
  limit = 50
): UseQueryResult<BalanceMovement[]> {
  return useQuery({
    queryKey: [BALANCE_KEY, "movements", studentId],
    queryFn: () => balanceService.listMovements(studentId!, limit),
    enabled: !!studentId,
  });
}

export function useDeposit(): UseMutationResult<
  BalanceMovement,
  Error,
  { studentId: string; data: DepositRequest }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }) =>
      balanceService.deposit(studentId, data),
    onSuccess: (_result, { studentId }) => {
      void qc.invalidateQueries({ queryKey: [BALANCE_KEY, studentId] });
      void qc.invalidateQueries({
        queryKey: [BALANCE_KEY, "movements", studentId],
      });
      void qc.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}

export function useApplyBalance(): UseMutationResult<
  BalanceMovement,
  Error,
  { studentId: string; data: ApplyBalanceRequest }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }) =>
      balanceService.applyToMembership(studentId, data),
    onSuccess: (_result, { studentId }) => {
      void qc.invalidateQueries({ queryKey: [BALANCE_KEY, studentId] });
      void qc.invalidateQueries({
        queryKey: [BALANCE_KEY, "movements", studentId],
      });
    },
  });
}
