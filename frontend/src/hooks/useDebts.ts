/** TanStack Query hooks for the Debts module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { PayDebtRequest, StudentDebt } from "@/types/debt";
import { debtService } from "@/services/debtService";
import { getApiErrorMessage } from "@/lib/apiError";
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
      invalidateAfterPayment(qc, studentId);
      toast.success("Adeudo cobrado");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al cobrar el adeudo"));
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
    onSuccess: (result, { studentId }) => {
      invalidateAfterPayment(qc, studentId);
      toast.success(`${result.length} adeudo(s) cobrado(s)`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error al cobrar los adeudos"));
    },
  });
}

/** Paying a debt moves money (transaction), may use balance and changes the statement. */
function invalidateAfterPayment(qc: ReturnType<typeof useQueryClient>, studentId: string): void {
  void qc.invalidateQueries({ queryKey: [DEBTS_KEY] });
  void qc.invalidateQueries({ queryKey: [TX_KEY] });
  void qc.invalidateQueries({ queryKey: ["balance", studentId] });
  void qc.invalidateQueries({ queryKey: ["balance", "movements", studentId] });
  void qc.invalidateQueries({ queryKey: ["account", studentId] });
}
