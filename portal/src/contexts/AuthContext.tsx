/**
 * Authentication context using AWS Cognito for the student portal.
 * Provides user state, login, logout, and token management.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  type SignInInput,
} from 'aws-amplify/auth'

export interface PortalUser {
  userId: string
  email: string
  name?: string
  groups: string[]
}

interface AuthContextType {
  user: PortalUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const isDev = import.meta.env.DEV

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<PortalUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkUser = useCallback(async () => {
    try {
      if (isDev) {
        // Local dev bypass — mock student user
        setUser({
          userId: 'dev-student-001',
          email: 'alumno@fitness-room.local',
          name: 'Alumno Demo',
          groups: ['student'],
        })
        setIsLoading(false)
        return
      }

      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()
      const groups =
        (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[]) ?? []

      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId ?? '',
        name: currentUser.username,
        groups,
      })
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const login = async (email: string, password: string): Promise<void> => {
    if (isDev) {
      // Dev bypass
      localStorage.setItem('id_token', 'dev-token')
      setUser({
        userId: 'dev-student-001',
        email,
        name: 'Alumno Demo',
        groups: ['student'],
      })
      return
    }

    const input: SignInInput = { username: email, password }
    await signIn(input)
    await checkUser()

    // Store token for API interceptor
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    if (token) {
      localStorage.setItem('id_token', token)
    }
  }

  const logout = async (): Promise<void> => {
    if (!isDev) {
      await signOut()
    }
    localStorage.removeItem('id_token')
    setUser(null)
  }

  const getAccessToken = async (): Promise<string | null> => {
    if (isDev) return 'dev-token'
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString() ?? null
      if (token) {
        localStorage.setItem('id_token', token)
      }
      return token
    } catch {
      return null
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
