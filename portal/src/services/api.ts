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

export interface Student {
  student_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: string
  created_at: string
  updated_at: string
}

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

export interface Reservation {
  reservation_id: string
  student_id: string
  class_id: string
  class_date: string
  status: string
  created_at: string
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
  getProfile: () => apiClient.get<Student>('/api/v1/portal/profile'),
  
  // Membership
  getMembership: () => apiClient.get<Membership>('/api/v1/portal/membership'),
  
  // Reservations
  getReservations: () => apiClient.get<Reservation[]>('/api/v1/portal/reservations'),
  cancelReservation: (id: string) => apiClient.delete<MessageResponse>(`/api/v1/portal/reservations/${id}`),
  
  // Check-ins
  getCheckins: (limit: number = 30) => apiClient.get<Checkin[]>(`/api/v1/portal/checkins?limit=${limit}`),
  
  // QR
  getQR: () => apiClient.get<{ student_id: string; student_name: string; qr_base64: string; mime_type: string }>('/api/v1/portal/qr'),
}

interface MessageResponse {
  message: string
}
