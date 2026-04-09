import { useQuery } from '@tanstack/react-query'
import { portalApi, type Profile, type MembershipResponse } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, Button, LoadingState } from '../components'

const isDev = import.meta.env.DEV

// Mock data for development
const mockProfile: Profile = {
  role: 'staff',
  instructor_id: 'dev-instructor-123',
  first_name: 'Carlos',
  last_name: 'Rodríguez',
  email: 'carlos.rodriguez@example.com',
  phone: '+52 55 9876 5432',
  status: 'active',
  specialties: ['Yoga', 'Pilates', 'Spinning'],
  bio: 'Instructor certificado con 10 años de experiencia en fitness y bienestar.',
  created_at: '2023-06-15T10:30:00Z',
  updated_at: '2024-04-01T15:45:00Z',
}

const mockMembership: MembershipResponse = {
  role: 'staff',
  membership: null,
}

export default function Dashboard() {
  const navigate = useNavigate()
  
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => portalApi.getProfile().then((res) => res.data),
    enabled: !isDev,
  })
  
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['membership'],
    queryFn: () => portalApi.getMembership().then((res) => res.data),
    enabled: !isDev,
  })

  // Use mock data in dev mode
  const displayProfile = isDev ? mockProfile : profile
  const displayMembership = isDev ? mockMembership : membership
  const membershipData = displayMembership?.membership
  const role = displayProfile?.role || 'student'
  const isStudent = role === 'student'

  if ((profileLoading || membershipLoading) && !isDev) {
    return <LoadingState />
  }

  return (
    <Container>
      <div style={{ maxWidth: '480px', margin: '0 auto', paddingBottom: '100px' }}>
        <header style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#000000',
            }}
          >
            {displayProfile?.first_name?.[0]?.toUpperCase()}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>
            Hola, {displayProfile?.first_name} 👋
          </h1>
          <p style={{ color: '#9ca3af', margin: 0 }}>Bienvenido a tu portal personal</p>
          {isDev && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: 'rgba(250, 204, 21, 0.1)',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                borderRadius: '12px',
                display: 'inline-block',
              }}
            >
              <span style={{ fontSize: '12px', color: '#facc15' }}>⚠️ Modo desarrollo</span>
            </div>
          )}
        </header>

        <div style={{ display: 'grid', gap: '16px' }}>
          <Card variant="gold">
            <Button onClick={() => navigate('/qr')} variant="gold" fullWidth>
              🎯 Mi Código QR
            </Button>
            <p style={{ fontSize: '13px', color: '#d4af37', opacity: 0.8, marginTop: '12px', textAlign: 'center', margin: '12px 0 0 0' }}>
              Escanea para hacer check-in
            </p>
          </Card>

          <Card onClick={() => navigate('/schedule')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                📅
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
                  Mis Clases
                </h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                  Ver tus reservaciones
                </p>
              </div>
              <span style={{ fontSize: '20px', color: '#6366f1' }}>→</span>
            </div>
          </Card>

          <Card onClick={() => navigate('/profile')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                👤
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
                  Mi Perfil
                </h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                  Editar tu información
                </p>
              </div>
              <span style={{ fontSize: '20px', color: '#10b981' }}>→</span>
            </div>
          </Card>
        </div>

        {isStudent && membershipData && (
          <Card variant="gradient" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                💎
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                Membresía Vigente
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                }}
              >
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px 0' }}>Tipo</p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  {membershipData.membership_type}
                </p>
              </div>
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                }}
              >
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px 0' }}>Estado</p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#10b981', margin: 0 }}>
                  {membershipData.status}
                </p>
              </div>
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  gridColumn: 'span 2',
                }}
              >
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px 0' }}>Vence</p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  {membershipData.end_date}
                </p>
              </div>
              {membershipData.days_until_expiry !== undefined && (
                <div
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    gridColumn: 'span 2',
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#d4af37', margin: '0 0 4px 0' }}>Días restantes</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#d4af37', margin: 0 }}>
                    {membershipData.days_until_expiry}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Container>
  )
}
