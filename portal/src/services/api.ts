import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('id_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type UserRole = 'student' | 'staff'

export interface StudentProfile {
  role: 'student'
  student_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: string
  created_at: string
  updated_at: string
}

export interface StaffProfile {
  role: 'staff'
  instructor_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: string
  specialties?: string[]
  bio?: string
  created_at: string
  updated_at: string
}

export type Profile = StudentProfile | StaffProfile

export interface Membership {
  membership_id: string
  student_id: string
  membership_type: string
  status: string
  start_date: string
  end_date: string
  price_paid: number
  days_until_expiry?: number
  classes_remaining?: number | null
}

export interface MembershipResponse {
  role: 'student' | 'staff'
  membership: Membership | null
}

export interface Reservation {
  reservation_id: string
  student_id: string
  class_id: string
  class_date: string
  status: string
  created_at: string
  class_type?: string
  start_time?: string
  instructor_name?: string
  location?: string
  can_cancel?: boolean
  cancel_reason?: string
}

export interface StaffClass {
  class_id: string
  class_name: string
  class_date: string
  start_time?: string
  instructor_id: string
  instructor_name?: string
  location?: string
  capacity?: number
  reservations_count?: number
  status: string
}

export interface ReservationsResponse {
  role: 'student' | 'staff'
  items: Reservation[] | StaffClass[]
}

export interface UpcomingClass {
  class_id: string
  class_type: string
  class_date: string
  start_time: string
  duration_minutes: number
  instructor_name: string
  location: string
  capacity: number
  reservations_count: number
  waitlist_count: number
  available_spots: number
  is_full: boolean
  description?: string
  my_status: 'confirmed' | 'waitlisted' | null
  my_reservation_id: string | null
}

export interface UpcomingClassesResponse {
  items: UpcomingClass[]
}

export interface EnrollmentResponse {
  message: string
  status: 'confirmed' | 'waitlisted'
  reservation_id: string
  waitlist_position?: number
}

export interface ClassAttendee {
  first_name: string
  last_initial: string
  status: 'confirmed' | 'waitlisted'
}

export interface ClassDetail {
  class_id: string
  class_type: string
  instructor_name: string
  class_date: string
  start_time: string
  duration_minutes: number
  capacity: number
  location: string | null
  description: string | null
  is_cancelled: boolean
  reservations_count: number
  waitlist_count: number
  available_spots: number
  confirmed: ClassAttendee[]
  waitlisted: ClassAttendee[]
}

export interface Checkin {
  checkin_id: string
  student_id: string
  checked_in_at: string
  can_enter: boolean
  reason: string
}

export const portalApi = {
  // Profile
  getProfile: () => apiClient.get<Profile>('/api/v1/portal/profile'),
  
  // Membership
  getMembership: () => apiClient.get<MembershipResponse>('/api/v1/portal/membership'),
  
  // Upcoming Classes
  getUpcomingClasses: (days: number = 7) => apiClient.get<UpcomingClassesResponse>(`/api/v1/portal/classes?days=${days}`),
  
  // Reservations
  getReservations: (statusFilter?: string) => {
    const params = statusFilter ? `?status=${statusFilter}` : ''
    return apiClient.get<ReservationsResponse>(`/api/v1/portal/reservations${params}`)
  },
  cancelReservation: (classId: string) => apiClient.delete<MessageResponse>(`/api/v1/portal/reservations/${classId}`),
  
  // Enrollment (self-service)
  enrollInClass: (classId: string) => apiClient.post<EnrollmentResponse>(`/api/v1/portal/reservations?class_id=${classId}`),
  
  // Check-ins
  getCheckins: (limit: number = 30) => apiClient.get<Checkin[]>(`/api/v1/portal/checkins?limit=${limit}`),
  
  // QR
  getQR: () => apiClient.get<{ role: UserRole; user_id: string; user_name: string; qr_base64: string; mime_type: string }>('/api/v1/portal/qr'),

  // Class detail
  getClassDetail: (classId: string) => apiClient.get<ClassDetail>(`/api/v1/portal/classes/${classId}`),
}

interface MessageResponse {
  message: string
}
