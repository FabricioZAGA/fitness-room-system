import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type AuthStep } from '../contexts/AuthContext'
import { Container } from '../components'

const inputStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(17, 24, 39, 0.8)',
  color: '#fff',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const btnStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #d4af37, #f59e0b)',
  color: '#000',
  fontWeight: 'bold',
  fontSize: '16px',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
}

export default function Login(): React.JSX.Element {
  const navigate = useNavigate()
  const {
    login, isAuthenticated, authStep,
    completeNewPassword, forgotPassword, confirmForgotPassword, resetAuthStep,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [localStep, setLocalStep] = useState<'login' | 'forgotPassword' | 'confirmReset'>('login')

  const step: AuthStep | 'forgotPassword' | 'confirmReset' =
    authStep !== 'login' ? authStep : localStep

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true })
  }

  function clearState(): void {
    setError('')
    setSuccessMsg('')
    setNewPw('')
    setConfirmPw('')
    setResetCode('')
  }

  function goBack(): void {
    clearState()
    resetAuthStep()
    setLocalStep('login')
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

  const handleNewPassword = async (): Promise<void> => {
    if (newPw !== confirmPw) { setError('Las contraseñas no coinciden'); return }
    if (newPw.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await completeNewPassword(newPw)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (): Promise<void> => {
    if (!email) { setError('Ingresa tu correo electrónico primero'); return }
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setLocalStep('confirmReset')
      setSuccessMsg('Te enviamos un código de verificación a tu correo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar código')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReset = async (): Promise<void> => {
    if (newPw !== confirmPw) { setError('Las contraseñas no coinciden'); return }
    if (newPw.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await confirmForgotPassword(email, resetCode, newPw)
      setLocalStep('login')
      setSuccessMsg('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void): void => {
    if (e.key === 'Enter') action()
  }

  const titles: Record<string, { heading: string; sub: string }> = {
    login: { heading: 'Portal del Alumno', sub: 'Ingresa tus datos para acceder' },
    newPasswordRequired: { heading: 'Cambiar contraseña', sub: 'Por seguridad, elige una nueva contraseña' },
    forgotPassword: { heading: 'Recuperar contraseña', sub: 'Ingresa tu correo para recibir un código' },
    confirmReset: { heading: 'Restaurar contraseña', sub: 'Ingresa el código y tu nueva contraseña' },
  }

  const { heading, sub } = titles[step] ?? titles.login

  return (
    <Container>
      <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '60px', paddingBottom: '40px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
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
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#d4af37', margin: 0 }}>
            Fitness Room
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginTop: '8px', fontWeight: 500 }}>
            {heading}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>
            {sub}
          </p>
        </div>

        {/* Back button */}
        {step !== 'login' && (
          <button
            onClick={goBack}
            style={{
              background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer',
              fontSize: '14px', marginBottom: '16px', padding: 0,
            }}
          >
            ← Volver al inicio de sesión
          </button>
        )}

        {/* Messages */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center',
          }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e', fontSize: '14px', marginBottom: '16px', textAlign: 'center',
          }}>
            {successMsg}
          </div>
        )}

        {/* ── LOGIN ── */}
        {step === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Correo electrónico" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleLogin)}
              autoComplete="email" required style={inputStyle} />
            <input type="password" placeholder="Contraseña" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleLogin)}
              autoComplete="current-password" required style={inputStyle} />
            <button onClick={handleLogin} disabled={loading || !email || !password}
              style={{ ...btnStyle, opacity: (loading || !email || !password) ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
            <button
              onClick={() => { clearState(); setLocalStep('forgotPassword') }}
              style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '14px', marginTop: '4px' }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {/* ── NEW PASSWORD REQUIRED ── */}
        {step === 'newPasswordRequired' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="password" placeholder="Nueva contraseña (mín. 8 caracteres)" value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleNewPassword)}
              style={inputStyle} />
            <input type="password" placeholder="Confirmar nueva contraseña" value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleNewPassword)}
              style={inputStyle} />
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>Las contraseñas no coinciden</p>
            )}
            <div style={{
              padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)',
              fontSize: '13px', color: 'rgba(255,255,255,0.8)',
            }}>
              Mínimo 8 caracteres, incluir mayúsculas, minúsculas y números.
            </div>
            <button onClick={handleNewPassword}
              disabled={loading || newPw.length < 8 || newPw !== confirmPw}
              style={{ ...btnStyle, opacity: (loading || newPw.length < 8 || newPw !== confirmPw) ? 0.5 : 1 }}>
              {loading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {step === 'forgotPassword' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Correo electrónico" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleForgotPassword)}
              autoComplete="email" style={inputStyle} />
            <button onClick={handleForgotPassword} disabled={loading || !email}
              style={{ ...btnStyle, opacity: (loading || !email) ? 0.5 : 1 }}>
              {loading ? 'Enviando código...' : 'Enviar código de verificación'}
            </button>
          </div>
        )}

        {/* ── CONFIRM RESET ── */}
        {step === 'confirmReset' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="Código de verificación" value={resetCode}
              onChange={(e) => setResetCode(e.target.value)} maxLength={6}
              style={{ ...inputStyle, letterSpacing: '4px', fontFamily: 'monospace', textAlign: 'center' }} />
            <input type="password" placeholder="Nueva contraseña" value={newPw}
              onChange={(e) => setNewPw(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirmar nueva contraseña" value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleConfirmReset)}
              style={inputStyle} />
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>Las contraseñas no coinciden</p>
            )}
            <button onClick={handleConfirmReset}
              disabled={loading || !resetCode || newPw.length < 8 || newPw !== confirmPw}
              style={{ ...btnStyle, opacity: (loading || !resetCode || newPw.length < 8 || newPw !== confirmPw) ? 0.5 : 1 }}>
              {loading ? 'Restaurando...' : 'Restaurar contraseña'}
            </button>
          </div>
        )}
      </div>
    </Container>
  )
}
