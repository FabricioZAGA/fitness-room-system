/** TypeScript types for Report responses. */

export interface IncomeDay {
  date: string;
  total: number;
  cash: number;
  card: number;
  transfer: number;
  count: number;
}

export interface IncomeReport {
  start_date: string;
  end_date: string;
  grand_total: number;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  by_type: Record<string, number>;
  days: IncomeDay[];
}

export interface AttendanceSummary {
  period_days: number;
  attended: number;
  no_show: number;
  confirmed: number;
  cancelled: number;
  total: number;
}

export interface StudentRanking {
  student_id: string;
  student_name: string;
  checkin_count: number;
}

export interface InactiveStudent {
  student_id: string;
  student_name: string;
  status: string;
  email: string;
  phone: string | null;
}
