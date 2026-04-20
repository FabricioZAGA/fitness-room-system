import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Container } from '../components'

export default function Login(): React.JSX.Element {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true })
  }

  const handleLogin = async (): Promise<void> => {
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <Container>
      <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '80px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#000',
            }}
          >
            FR
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#d4af37',
              margin: 0,
            }}
          >
            Fitness Room
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>
            Portal del Alumno
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(17, 24, 39, 0.8)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(17, 24, 39, 0.8)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: loading ? 'rgba(212,175,55,0.5)' : 'linear-gradient(135deg, #d4af37, #f59e0b)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '16px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              opacity: (!email || !password) ? 0.5 : 1,
            }}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </Container>
  )
}
