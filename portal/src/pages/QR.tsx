import { useQuery } from '@tanstack/react-query'
import { portalApi, type UserRole } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const mockQRData = {
  role: 'staff' as UserRole,
  user_id: 'dev-instructor-123',
  user_name: 'Carlos Rodríguez',
  qr_base64: '', // Will generate a placeholder QR
  mime_type: 'image/png',
}

export default function QR() {
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
            borderRadius: '16px',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            backgroundColor: 'rgba(212, 175, 55, 0.06)',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          {isDev ? (
            <div
              style={{
                margin: '0 auto 16px auto',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                padding: '16px',
                width: '200px',
                height: '200px',
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
              alt="QR Code"
              style={{ margin: '0 auto 16px auto', borderRadius: '8px', width: '200px', height: '200px' }}
            />
          ) : null}
          <p style={{ color: '#ffffff', fontWeight: 600, marginBottom: '8px', fontSize: '18px', margin: '0 0 8px 0' }}>
            {displayQRData?.user_name}
          </p>
          <p style={{ fontSize: '14px', color: '#d4af37', opacity: 0.9, marginBottom: '16px', margin: '0 0 16px 0' }}>
            Muestra este código en la recepción
          </p>
          {isDev && (
            <p style={{ fontSize: '12px', color: '#facc15', opacity: 0.9, marginTop: '8px' }}>
              ⚠️ Modo desarrollo - QR de prueba
            </p>
          )}
        </div>
      </div>
    </Container>
  )
}
