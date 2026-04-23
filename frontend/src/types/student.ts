/** TypeScript types for the Student entity — mirrors backend Pydantic models. */

export type StudentStatus = "active" | "inactive" | "suspended";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  age: number | null;
  address: string | null;
  city: string | null;
  emergency_contact: EmergencyContact | null;
  photo_url: string | null;
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
  birth_date?: string;
  address?: string;
  city?: string;
  emergency_contact?: EmergencyContact;
  photo_url?: string;
  status?: StudentStatus;
  notes?: string;
}

export interface UpdateStudentRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  emergency_contact?: EmergencyContact;
  photo_url?: string;
  status?: StudentStatus;
  notes?: string;
}
