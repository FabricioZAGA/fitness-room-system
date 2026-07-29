/** TanStack Query hooks for the Debts module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { PayDebtRequest, StudentDebt } from "@/types/debt";
import { debtService } from "@/services/debtService";
import { TX_KEY } from "./useTransactions";

export const DEBTS_KEY = "debts";

export function useStudentDebts(
  studentId: string | undefined
): UseQueryResult<StudentDebt[]> {
  return useQuery({
    queryKey: [DEBTS_KEY, "student", studentId],
    queryFn: () => debtService.listForStudent(studentId!),
    enabled: !!studentId,
  });
}

export function useAllPendingDebts(
  limit = 200
): UseQueryResult<StudentDebt[]> {
  return useQuery({
    queryKey: [DEBTS_KEY, "pending"],
    queryFn: () => debtService.listAllPending(limit),
  });
}

export function usePayDebt(): UseMutationResult<
  StudentDebt,
  Error,
  { studentId: string; saleId: string; data: PayDebtRequest }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, saleId, data }) =>
      debtService.payDebt(studentId, saleId, data),
    onSuccess: (_result, { studentId }) => {
      void qc.invalidateQueries({ queryKey: [DEBTS_KEY, "student", studentId] });
      void qc.invalidateQueries({ queryKey: [DEBTS_KEY, "pending"] });
      void qc.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}

export function usePayAllDebts(): UseMutationResult<
  StudentDebt[],
  Error,
  { studentId: string; data: PayDebtRequest }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }) =>
      debtService.payAllDebts(studentId, data),
    onSuccess: (_result, { studentId }) => {
      void qc.invalidateQueries({ queryKey: [DEBTS_KEY, "student", studentId] });
      void qc.invalidateQueries({ queryKey: [DEBTS_KEY, "pending"] });
      void qc.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}
