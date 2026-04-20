import { useQuery } from '@tanstack/react-query'
import { portalApi, type UserRole } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const mockQRData = {
  role: 'student' as UserRole,
  user_id: 'dev-student-001',
  user_name: 'Alumno Demo',
  qr_base64: '',
  mime_type: 'image/png',
}

export default function QR(): React.JSX.Element {
  const navigate = useNavigate()
  
  const { data: qrData, isLoading } = useQuery({
    queryKey: ['qr'],
    queryFn: () => portalApi.getQR().then((res) => res.data),
    enabled: !isDev,
  })

  const displayQRData = isDev ? mockQRData : qrData

  if (isLoading && !isDev) {
    return <LoadingState />
  }

  return (
    <Container>
      <div style={{ maxWidth: '448px', margin: '0 auto' }}>
        <PageHeader title="Mi Código QR" onBack={() => navigate('/dashboard')} />

        <div
          style={{
            borderRadius: '24px',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            backgroundColor: 'rgba(212, 175, 55, 0.06)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          {isDev ? (
            <div
              style={{
                margin: '0 auto 24px auto',
                borderRadius: '16px',
                backgroundColor: '#ffffff',
                padding: '24px',
                width: '240px',
                height: '240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#000000', fontSize: '32px', fontWeight: 'bold' }}>QR</span>
            </div>
          ) : displayQRData?.qr_base64 ? (
            <img
              src={`data:${displayQRData.mime_type};base64,${displayQRData.qr_base64}`}
              alt="Código QR para check-in"
              style={{
                margin: '0 auto 24px auto',
                borderRadius: '16px',
                width: '240px',
                height: '240px',
                display: 'block',
              }}
            />
          ) : null}

          <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '20px', margin: '0 0 4px 0' }}>
            {displayQRData?.user_name}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 20px 0' }}>
            ID: {displayQRData?.user_id?.slice(-8)}
          </p>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
            }}
          >
            <p style={{ fontSize: '14px', color: '#d4af37', margin: 0, fontWeight: 500 }}>
              Muestra este código en el kiosco de entrada
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(212, 175, 55, 0.7)', margin: '4px 0 0 0' }}>
              El escáner registrará tu acceso automáticamente
            </p>
          </div>

          {isDev && (
            <p style={{ fontSize: '12px', color: '#facc15', opacity: 0.9, marginTop: '16px' }}>
              Modo desarrollo — QR de prueba
            </p>
          )}
        </div>
      </div>
    </Container>
  )
}
