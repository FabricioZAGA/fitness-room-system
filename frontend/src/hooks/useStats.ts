/** TanStack Query hook for the Stats module. */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { DashboardStats } from "@/services/statsService";
import { statsService } from "@/services/statsService";

export const STATS_KEY = "stats";

export function useDashboardStats(): UseQueryResult<DashboardStats> {
  return useQuery({
    queryKey: [STATS_KEY, "dashboard"],
    queryFn: () => statsService.getDashboardStats(),
    staleTime: 0,                   // Always re-fetch on mount
    refetchInterval: 1000 * 30,     // Refresh every 30 seconds
  });
}
