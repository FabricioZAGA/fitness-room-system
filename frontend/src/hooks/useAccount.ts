/** TanStack Query hooks for the student account statement. */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { StudentAccount } from "@/types/account";
import { accountService } from "@/services/accountService";

export const ACCOUNT_KEY = "account";

export function useStudentAccount(studentId: string | undefined): UseQueryResult<StudentAccount> {
  return useQuery({
    queryKey: [ACCOUNT_KEY, studentId],
    queryFn: () => accountService.getStatement(studentId!),
    enabled: !!studentId,
  });
}
