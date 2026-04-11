import { useQuery } from '@tanstack/react-query'
import { portalApi, type ReservationsResponse } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const mockReservations: ReservationsResponse = {
  role: 'staff',
  items: [
    {
      class_id: 'class-1',
      class_name: 'Yoga Avanzado',
      class_date: '2024-04-10 18:00',
      instructor_id: 'dev-instructor-123',
      status: 'scheduled',
    },
    {
      class_id: 'class-2',
      class_name: 'Pilates Core',
      class_date: '2024-04-12 10:00',
      instructor_id: 'dev-instructor-123',
      status: 'scheduled',
    },
  ],
}

export default function Schedule() {
  const navigate = useNavigate()
  
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => portalApi.getReservations().then((res) => res.data),
    enabled: !isDev,
  })

  const displayReservations = isDev ? mockReservations : reservations
  const role = displayReservations?.role || 'student'
  const items = displayReservations?.items || []
  const isStudent = role === 'student'

  if (isLoading && !isDev) {
    return <LoadingState />
  }

  return (
    <Container>
      <div style={{ maxWidth: '672px', margin: '0 auto' }}>
        <PageHeader title={isStudent ? 'Mis Clases' : 'Clases Asignadas'} onBack={() => navigate('/dashboard')} />

        {items && items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item: any) => (
              <Card key={item.reservation_id || item.class_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: '#ffffff', fontWeight: 600, margin: '0 0 4px 0' }}>
                      {isStudent ? item.class_date : item.class_date}
                    </p>
                    <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                      {isStudent ? `ID: ${item.reservation_id}` : item.class_name}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor:
                        item.status === 'confirmed'
                          ? '#14532d'
                          : item.status === 'cancelled'
                            ? '#7f1d1d'
                            : '#713f12',
                      color:
                        item.status === 'confirmed'
                          ? '#4ade80'
                          : item.status === 'cancelled'
                            ? '#f87171'
                            : '#facc15',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                {isStudent && item.status === 'confirmed' && !isDev && (
                  <button
                    onClick={() => portalApi.cancelReservation(item.class_id)}
                    style={{ marginTop: '16px', fontSize: '14px', color: '#f87171', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    Cancelar reservación
                  </button>
                )}
                {isDev && (
                  <p style={{ fontSize: '12px', color: '#facc15', marginTop: '8px' }}>
                    ⚠️ Modo desarrollo - No se puede cancelar
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <p style={{ color: '#9ca3af', margin: 0 }}>
                {isStudent ? 'No tienes reservaciones programadas' : 'No tienes clases asignadas'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </Container>
  )
}
