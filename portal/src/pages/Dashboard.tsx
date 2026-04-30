import { useQuery } from '@tanstack/react-query'
import { portalApi, type Profile, type MembershipResponse } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'
import { Container, Card, Button, LoadingState, ErrorState } from '../components'

const isDev = import.meta.env.DEV

const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  founder: 'Socio Fundador',
  room_daily: 'Room Daily',
  room_elite: 'Room Elite',
  room_flex: 'Room Flex',
  room_pass: 'Room Pass',
  // Legacy (hasta que la migración termine)
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual',
  founder_monthly: 'Fundador (Mensual)',
  class_pack_5: 'Pack 5 Clases',
  class_pack_10: 'Pack 10 Clases',
  class_pack_20: 'Pack 20 Clases',
  day_pass: 'Pase de Día',
}

// Mock data for development
const mockProfile: Profile = {
  role: 'student',
  student_id: 'dev-student-001',
  first_name: 'Alumno',
  last_name: 'Demo',
  email: 'alumno@fitness-room.local',
  phone: '+52 55 1234 5678',
  status: 'active',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-04-01T15:45:00Z',
}

const mockMembership: MembershipResponse = {
  role: 'student',
  membership: {
    membership_id: 'mem-dev-001',
    student_id: 'dev-student-001',
    membership_type: 'room_daily',
    status: 'active',
    start_date: '2024-04-01',
    end_date: '2024-04-30',
    price_paid: 1300,
    days_until_expiry: 18,
    classes_remaining: null,
  },
}

export default function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const portalRole = useRole()
  
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => portalApi.getProfile().then((res) => res.data),
    enabled: !isDev,
  })

  const { data: membership, isLoading: membershipLoading, isError: membershipError, refetch: refetchMembership } = useQuery({
    queryKey: ['membership'],
    queryFn: () => portalApi.getMembership().then((res) => res.data),
    enabled: !isDev,
  })

  if ((profileError || membershipError) && !isDev) {
    return (
      <ErrorState
        title="Error al cargar el dashboard"
        message="No pudimos obtener tu información. Verifica tu conexión e intenta de nuevo."
        onRetry={() => { refetchProfile(); refetchMembership(); }}
      />
    )
  }

  if ((profileLoading || membershipLoading) && !isDev) {
    return <LoadingState />
  }

  // Use mock data in dev mode
  const displayProfile = isDev ? mockProfile : profile
  const displayMembership = isDev ? mockMembership : membership
  const membershipData = displayMembership?.membership
  const role = displayProfile?.role || portalRole
  const isStudent = role === 'student'
  const isStaff = role === 'staff'

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
          {/* QR — students only */}
          {isStudent && (
            <Card variant="gold">
              <Button onClick={() => navigate('/qr')} variant="gold" fullWidth>
                🎯 Mi Código QR
              </Button>
              <p style={{ fontSize: '13px', color: '#d4af37', opacity: 0.8, marginTop: '12px', textAlign: 'center', margin: '12px 0 0 0' }}>
                Escanea para hacer check-in
              </p>
            </Card>
          )}

          {/* Staff/Instructor: My assigned classes */}
          {isStaff && (
            <Card variant="gold">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  🏋️
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
                    Mis Clases Asignadas
                  </h3>
                  <p style={{ fontSize: '13px', color: '#d4af37', margin: 0 }}>
                    Ve y administra las clases que impartes
                  </p>
                </div>
                <span style={{ fontSize: '20px', color: '#d4af37' }}>→</span>
              </div>
            </Card>
          )}

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
                  {isStaff ? 'Horario General' : 'Mis Clases'}
                </h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                  {isStaff ? 'Ve el horario completo del gym' : 'Inscríbete y administra tus clases'}
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
                  Ver tu información
                </p>
              </div>
              <span style={{ fontSize: '20px', color: '#10b981' }}>→</span>
            </div>
          </Card>
        </div>

        {/* Logout button */}
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={async () => { await logout(); navigate('/login') }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(17, 24, 39, 0.6)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
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
                  {MEMBERSHIP_TYPE_LABELS[membershipData.membership_type] ?? membershipData.membership_type}
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
