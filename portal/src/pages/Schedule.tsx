import { useQuery } from '@tanstack/react-query'
import { portalApi, type ReservationsResponse, type Reservation, type StaffClass } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const mockReservations: ReservationsResponse = {
  role: 'student',
  items: [
    {
      reservation_id: 'res-001',
      student_id: 'dev-student-123',
      class_id: 'class-1',
      class_date: '2026-04-14 07:00',
      status: 'confirmed',
      created_at: '2026-04-11T10:00:00Z',
    },
    {
      reservation_id: 'res-002',
      student_id: 'dev-student-123',
      class_id: 'class-2',
      class_date: '2026-04-16 18:30',
      status: 'confirmed',
      created_at: '2026-04-11T10:05:00Z',
    },
    {
      reservation_id: 'res-003',
      student_id: 'dev-student-123',
      class_id: 'class-3',
      class_date: '2026-04-08 09:00',
      status: 'attended',
      created_at: '2026-04-07T09:00:00Z',
    },
  ] as Reservation[],
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
            {items.map((item: Reservation | StaffClass) => {
              const key = isStudent
                ? (item as Reservation).reservation_id
                : (item as StaffClass).class_id
              const title = isStudent
                ? (item as Reservation).class_date
                : (item as StaffClass).class_name
              const subtitle = isStudent
                ? `Reservación #${(item as Reservation).reservation_id?.slice(-6)}`
                : (item as StaffClass).class_date
              const statusBg =
                item.status === 'confirmed' || item.status === 'attended'
                  ? 'var(--color-success-bg)'
                  : item.status === 'cancelled'
                    ? 'var(--color-danger-bg)'
                    : 'var(--color-warning-bg)'
              const statusColor =
                item.status === 'confirmed' || item.status === 'attended'
                  ? 'var(--color-success)'
                  : item.status === 'cancelled'
                    ? 'var(--color-danger)'
                    : 'var(--color-warning)'
              const statusLabel =
                item.status === 'confirmed' ? 'Confirmada'
                : item.status === 'attended' ? 'Asistida'
                : item.status === 'cancelled' ? 'Cancelada'
                : item.status === 'scheduled' ? 'Programada'
                : item.status

              return (
                <Card key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <p style={{ color: 'var(--tx-primary)', fontWeight: 600, margin: '0 0 4px 0' }}>
                        {title}
                      </p>
                      <p style={{ fontSize: '14px', color: 'var(--tx-muted)', margin: 0 }}>
                        {subtitle}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: statusBg,
                        color: statusColor,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {isStudent && item.status === 'confirmed' && !isDev && (
                    <button
                      onClick={() => portalApi.cancelReservation((item as Reservation).class_id)}
                      style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                      Cancelar reservación
                    </button>
                  )}
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <p style={{ color: 'var(--tx-muted)', margin: 0 }}>
                {isStudent ? 'No tienes reservaciones programadas' : 'No tienes clases asignadas'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </Container>
  )
}
