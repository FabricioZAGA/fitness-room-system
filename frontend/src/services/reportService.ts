/** Reports API service. */

import type {
  AttendanceSummary,
  IncomeReport,
  InactiveStudent,
  StudentRanking,
} from "@/types/report";
import { apiClient } from "./apiClient";

export const reportService = {
  async incomeReport(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<IncomeReport> {
    const res = await apiClient.get<IncomeReport>("/reports/income", { params });
    return res.data;
  },

  async attendanceSummary(days?: number): Promise<AttendanceSummary> {
    const res = await apiClient.get<AttendanceSummary>("/reports/attendance", {
      params: days ? { days } : undefined,
    });
    return res.data;
  },

  async rankings(params?: { limit?: number; days?: number }): Promise<StudentRanking[]> {
    const res = await apiClient.get<StudentRanking[]>("/reports/rankings", {
      params,
    });
    return res.data;
  },

  async inactiveStudents(days?: number): Promise<InactiveStudent[]> {
    const res = await apiClient.get<InactiveStudent[]>("/reports/inactive", {
      params: days ? { days } : undefined,
    });
    return res.data;
  },
} as const;
