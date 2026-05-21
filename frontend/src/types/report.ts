/** TypeScript types for Report responses. */

export interface IncomeDay {
  date: string;
  total: number;
  cash: number;
  card: number;
  transfer: number;
  count: number;
}

export interface IncomeTransactionRow {
  transaction_id: string;
  date: string;
  datetime: string;
  student_id: string | null;
  student_name: string;
  transaction_type: string;
  payment_method: string;
  amount: number;
  reference_id: string | null;
  notes: string | null;
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
  transactions?: IncomeTransactionRow[];
}

export interface MembershipRangeRow {
  membership_id: string;
  student_id: string;
  student_name: string;
  membership_type: string;
  price: number;
  start_date: string;
  end_date: string;
  status: string;
  classes_remaining: number | null;
}

export interface MembershipRangeReport {
  start_date: string;
  end_date: string;
  count: number;
  total_revenue: number;
  by_type: Record<string, { count: number; revenue: number }>;
  memberships: MembershipRangeRow[];
}

export interface AttendanceSummary {
  period_days: number;
  start_date?: string;
  end_date?: string;
  period_label?: string;
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
  last_checkin: string | null;
}

export interface StudentExportRow {
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  birth_date: string;
  status: string;
  membership_type: string;
  membership_status: string;
  membership_expiry: string;
  membership_price: number;
  created_at: string;
}
