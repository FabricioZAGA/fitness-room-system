/**
 * Determines user role from Cognito groups.
 * Returns 'staff' for staff/teacher groups, 'student' otherwise.
 */

import { useAuth } from '../contexts/AuthContext'

export type PortalRole = 'student' | 'staff'

export function useRole(): PortalRole {
  const { user } = useAuth()
  const groups = user?.groups ?? []
  if (groups.includes('staff') || groups.includes('teacher')) return 'staff'
  return 'student'
}

export function useIsStaff(): boolean {
  return useRole() === 'staff'
}
