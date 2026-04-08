/** TanStack Query hook for the Stats module. */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { DashboardStats } from "@/services/statsService";
import { statsService } from "@/services/statsService";

export const STATS_KEY = "stats";

export function useDashboardStats(): UseQueryResult<DashboardStats> {
  return useQuery({
    queryKey: [STATS_KEY, "dashboard"],
    queryFn: () => statsService.getDashboardStats(),
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}
