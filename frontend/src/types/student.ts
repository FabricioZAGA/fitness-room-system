/** TypeScript types for the Student entity — mirrors backend Pydantic models. */

export type StudentStatus = "active" | "inactive" | "founder" | "new";

export interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: StudentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status?: StudentStatus;
  notes?: string;
}

export interface UpdateStudentRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: StudentStatus;
  notes?: string;
}
