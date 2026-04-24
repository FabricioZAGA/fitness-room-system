/** TanStack Query hooks for SES suppression admin. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  emailAdminService,
  type SuppressionListResponse,
} from "@/services/emailAdminService";
import { getApiErrorMessage } from "@/lib/apiError";

export const SUPPRESSIONS_KEY = "ses-suppressions";

export function useSuppressions(): UseQueryResult<SuppressionListResponse> {
  return useQuery({
    queryKey: [SUPPRESSIONS_KEY],
    queryFn: () => emailAdminService.listSuppressions(200),
  });
}

export function useDeleteSuppression(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => emailAdminService.deleteSuppression(email),
    onSuccess: (_v, email) => {
      qc.invalidateQueries({ queryKey: [SUPPRESSIONS_KEY] });
      toast.success(`${email} removido de la lista de supresión.`);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, "Error al remover de supresión"));
    },
  });
}
