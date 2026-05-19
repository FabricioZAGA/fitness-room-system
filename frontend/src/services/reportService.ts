/** Reports API service. */

import type {
  AttendanceSummary,
  IncomeReport,
  InactiveStudent,
  MembershipRangeReport,
  StudentRanking,
} from "@/types/report";
import { apiClient } from "./apiClient";

export const reportService = {
  async incomeReport(params?: {
    start_date?: string;
    end_date?: string;
    include_transactions?: boolean;
  }): Promise<IncomeReport> {
    const res = await apiClient.get<IncomeReport>("/reports/income", { params });
    return res.data;
  },

  async membershipsRange(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<MembershipRangeReport> {
    const res = await apiClient.get<MembershipRangeReport>(
      "/reports/memberships-range",
      { params },
    );
    return res.data;
  },

  async attendanceSummary(params?: {
    days?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<AttendanceSummary> {
    const res = await apiClient.get<AttendanceSummary>("/reports/attendance", {
      params,
    });
    return res.data;
  },

  async rankings(params?: {
    limit?: number;
    days?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<StudentRanking[]> {
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
