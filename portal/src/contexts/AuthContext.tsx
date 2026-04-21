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
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
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

export type AuthStep = 'login' | 'newPasswordRequired' | 'forgotPassword' | 'confirmReset'

interface AuthContextType {
  user: PortalUser | null
  isLoading: boolean
  isAuthenticated: boolean
  authStep: AuthStep
  login: (email: string, password: string) => Promise<void>
  completeNewPassword: (newPassword: string, givenName: string, familyName: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>
  resetAuthStep: () => void
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const isDev = import.meta.env.DEV

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<PortalUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authStep, setAuthStep] = useState<AuthStep>('login')

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

      const allowedPortalGroups = ['student', 'teacher']
      const hasPortalAccess = groups.some((g) => allowedPortalGroups.includes(g))
      if (!hasPortalAccess) {
        await signOut()
        localStorage.removeItem('id_token')
        setUser(null)
        return
      }

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
    const result = await signIn(input)

    if (
      result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
    ) {
      setAuthStep('newPasswordRequired')
      return
    }

    const session = await fetchAuthSession()
    const groups = (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[]) ?? []
    const allowedPortalGroups = ['student', 'teacher']
    if (!groups.some((g) => allowedPortalGroups.includes(g))) {
      await signOut()
      localStorage.removeItem('id_token')
      throw new Error('Esta cuenta no tiene acceso al portal de alumnos. Si eres administrador, ingresa en admin.fitnessroom.mx')
    }

    await checkUser()

    const token = session.tokens?.idToken?.toString()
    if (token) {
      localStorage.setItem('id_token', token)
    }
  }

  const completeNewPassword = async (
    newPassword: string,
    givenName: string,
    familyName: string,
  ): Promise<void> => {
    await confirmSignIn({
      challengeResponse: newPassword,
      options: {
        userAttributes: {
          given_name: givenName,
          family_name: familyName,
        },
      },
    })

    const session = await fetchAuthSession()
    const groups = (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[]) ?? []
    const allowedPortalGroups = ['student', 'teacher']
    if (!groups.some((g) => allowedPortalGroups.includes(g))) {
      await signOut()
      localStorage.removeItem('id_token')
      throw new Error('Esta cuenta no tiene acceso al portal de alumnos. Si eres administrador, ingresa en admin.fitnessroom.mx')
    }

    setAuthStep('login')
    await checkUser()
    const token = session.tokens?.idToken?.toString()
    if (token) {
      localStorage.setItem('id_token', token)
    }
  }

  const forgotPasswordFn = async (email: string): Promise<void> => {
    await resetPassword({ username: email })
    setAuthStep('confirmReset')
  }

  const confirmForgotPasswordFn = async (
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> => {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword })
    setAuthStep('login')
  }

  const resetAuthStep = (): void => {
    setAuthStep('login')
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
        authStep,
        login,
        completeNewPassword,
        forgotPassword: forgotPasswordFn,
        confirmForgotPassword: confirmForgotPasswordFn,
        resetAuthStep,
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
