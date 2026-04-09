import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const mockReservations = [
  {
    reservation_id: 'res-1',
    student_id: 'dev-student-123',
    class_id: 'class-1',
    class_date: '2024-04-10 18:00',
    status: 'confirmed',
    created_at: '2024-04-08T10:00:00Z',
  },
  {
    reservation_id: 'res-2',
    student_id: 'dev-student-123',
    class_id: 'class-2',
    class_date: '2024-04-12 10:00',
    status: 'confirmed',
    created_at: '2024-04-08T10:00:00Z',
  },
]

export default function Schedule() {
  const navigate = useNavigate()
  
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => portalApi.getReservations().then((res) => res.data),
    enabled: !isDev,
  })

  const displayReservations = isDev ? mockReservations : reservations

  if (isLoading && !isDev) {
    return <LoadingState />
  }

  return (
    <Container>
      <div style={{ maxWidth: '672px', margin: '0 auto' }}>
        <PageHeader title="Mis Clases" onBack={() => navigate('/dashboard')} />

        {displayReservations && displayReservations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayReservations.map((reservation) => (
              <Card key={reservation.reservation_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: '#ffffff', fontWeight: 600, margin: '0 0 4px 0' }}>
                      {reservation.class_date}
                    </p>
                    <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                      ID: {reservation.reservation_id}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor:
                        reservation.status === 'confirmed'
                          ? '#14532d'
                          : reservation.status === 'cancelled'
                            ? '#7f1d1d'
                            : '#713f12',
                      color:
                        reservation.status === 'confirmed'
                          ? '#4ade80'
                          : reservation.status === 'cancelled'
                            ? '#f87171'
                            : '#facc15',
                    }}
                  >
                    {reservation.status}
                  </span>
                </div>
                {reservation.status === 'confirmed' && !isDev && (
                  <button
                    onClick={() => portalApi.cancelReservation(reservation.reservation_id)}
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
              <p style={{ color: '#9ca3af', margin: 0 }}>No tienes reservaciones programadas</p>
            </div>
          </Card>
        )}
      </div>
    </Container>
  )
}
