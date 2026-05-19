/** TanStack Query hooks for the Reports module. */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  AttendanceSummary,
  IncomeReport,
  InactiveStudent,
  MembershipRangeReport,
  StudentRanking,
} from "@/types/report";
import { reportService } from "@/services/reportService";

export const REPORT_KEY = "reports";

export function useIncomeReport(params?: {
  start_date?: string;
  end_date?: string;
  include_transactions?: boolean;
}): UseQueryResult<IncomeReport> {
  return useQuery({
    queryKey: [REPORT_KEY, "income", params],
    queryFn: () => reportService.incomeReport(params),
  });
}

export function useMembershipsRange(params?: {
  start_date?: string;
  end_date?: string;
}): UseQueryResult<MembershipRangeReport> {
  return useQuery({
    queryKey: [REPORT_KEY, "memberships-range", params],
    queryFn: () => reportService.membershipsRange(params),
  });
}

export function useAttendanceSummary(params?: {
  days?: number;
  start_date?: string;
  end_date?: string;
}): UseQueryResult<AttendanceSummary> {
  return useQuery({
    queryKey: [REPORT_KEY, "attendance", params],
    queryFn: () => reportService.attendanceSummary(params),
  });
}

export function useRankings(params?: {
  limit?: number;
  days?: number;
  start_date?: string;
  end_date?: string;
}): UseQueryResult<StudentRanking[]> {
  return useQuery({
    queryKey: [REPORT_KEY, "rankings", params],
    queryFn: () => reportService.rankings(params),
    refetchInterval: 1000 * 60 * 10, // refresh every 10 min
  });
}

export function useInactiveStudents(days?: number): UseQueryResult<InactiveStudent[]> {
  return useQuery({
    queryKey: [REPORT_KEY, "inactive", days],
    queryFn: () => reportService.inactiveStudents(days),
  });
}
