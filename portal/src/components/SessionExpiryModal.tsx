import { useEffect, useState } from 'react'
import { setKeepSession } from '../lib/sessionPreferences'

interface SessionExpiryModalProps {
  open: boolean
  secondsLeft: number
  onExtend: () => Promise<boolean>
  onLogout: () => void | Promise<void>
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
}

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  borderRadius: '20px',
  background: 'rgba(17, 24, 39, 0.98)',
  border: '1px solid rgba(212, 175, 55, 0.35)',
  padding: '28px',
  color: '#fff',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '14px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #d4af37, #f59e0b)',
  color: '#000',
  fontWeight: 'bold',
  fontSize: '15px',
  border: 'none',
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '14px',
  borderRadius: '14px',
  background: 'transparent',
  color: '#fff',
  fontWeight: 500,
  fontSize: '15px',
  border: '1px solid rgba(255,255,255,0.25)',
  cursor: 'pointer',
}

export default function SessionExpiryModal({
  open,
  secondsLeft,
  onExtend,
  onLogout,
}: SessionExpiryModalProps): React.JSX.Element | null {
  const [dontAsk, setDontAsk] = useState(false)
  const [extending, setExtending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      setDontAsk(false)
      setExtending(false)
      setErrorMsg('')
    }
  }, [open])

  if (!open) return null

  const handleExtend = async (): Promise<void> => {
    setExtending(true)
    setErrorMsg('')
    const ok = await onExtend()
    setExtending(false)
    if (!ok) {
      setErrorMsg('No pudimos extender tu sesión. Vuelve a iniciar sesión.')
      return
    }
    if (dontAsk) {
      setKeepSession(true)
    }
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.18)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            ⏳
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            Tu sesión está por expirar
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '8px 0 0' }}>
            Por seguridad cerraremos tu sesión. Puedes extenderla para seguir usando el portal.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>
            Expira en
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, color: '#d4af37' }}>
            {formatCountdown(secondsLeft)}
          </span>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            marginBottom: '14px',
          }}
        >
          <input
            type="checkbox"
            checked={dontAsk}
            onChange={(e) => setDontAsk(e.target.checked)}
            style={{ marginTop: '2px', accentColor: '#d4af37' }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              No volver a preguntar en este navegador
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
              Extenderemos tu sesión automáticamente mientras uses este equipo.
            </div>
          </div>
        </label>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '13px',
              marginBottom: '14px',
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => void onLogout()} disabled={extending} style={secondaryBtn}>
            Cerrar sesión
          </button>
          <button type="button" onClick={() => void handleExtend()} disabled={extending} style={primaryBtn}>
            {extending ? 'Extendiendo...' : 'Continuar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
