import { useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import QR from './pages/QR'
import Schedule from './pages/Schedule'
import BottomNav from './components/BottomNav'
import SessionExpiryModal from './components/SessionExpiryModal'
import { useSessionExpiry } from './hooks/useSessionExpiry'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(212,175,55,0.3)', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}

function SessionMonitor(): React.JSX.Element | null {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDev = import.meta.env.DEV
  const isLoginPage = location.pathname === '/login'

  const handleExpired = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const { status, secondsLeft, extend, dismiss } = useSessionExpiry({
    enabled: isAuthenticated && !isLoginPage && !isDev,
    onExpired: handleExpired,
  })

  const handleExtend = async (): Promise<boolean> => {
    const ok = await extend()
    if (!ok) {
      await handleExpired()
    }
    return ok
  }

  const handleLogoutFromModal = async (): Promise<void> => {
    dismiss()
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <SessionExpiryModal
      open={status === 'warning'}
      secondsLeft={secondsLeft}
      onExtend={handleExtend}
      onLogout={handleLogoutFromModal}
    />
  )
}

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/qr" element={<ProtectedRoute><QR /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <SessionMonitor />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
