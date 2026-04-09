import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const mockProfile = {
  student_id: 'dev-student-123',
  first_name: 'Juan',
  last_name: 'Pérez',
  email: 'juan.perez@example.com',
  phone: '+52 55 1234 5678',
  status: 'active',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-04-01T15:45:00Z',
}

export default function Profile() {
  const navigate = useNavigate()
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => portalApi.getProfile().then((res) => res.data),
    enabled: !isDev,
  })

  const displayProfile = isDev ? mockProfile : profile

  if (isLoading && !isDev) {
    return <LoadingState />
  }

  return (
    <Container>
      <div style={{ maxWidth: '448px', margin: '0 auto' }}>
        <PageHeader title="Mi Perfil" onBack={() => navigate('/dashboard')} />

        <Card>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              Nombre
            </label>
            <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>{displayProfile?.first_name}</p>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              Apellido
            </label>
            <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>{displayProfile?.last_name}</p>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              Email
            </label>
            <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>{displayProfile?.email}</p>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              Teléfono
            </label>
            <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>
              {displayProfile?.phone || 'No registrado'}
            </p>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              Estado
            </label>
            <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>{displayProfile?.status}</p>
          </div>
          {isDev && (
            <p style={{ fontSize: '12px', color: '#facc15', marginTop: '16px' }}>
              ⚠️ Modo desarrollo - Datos de prueba
            </p>
          )}
        </Card>
      </div>
    </Container>
  )
}
