import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi, type UpcomingClass, type Reservation } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, PageHeader, LoadingState } from '../components'

const isDev = import.meta.env.DEV

const CLASS_TYPE_LABELS: Record<string, string> = {
  yoga: 'Yoga',
  pilates: 'Pilates',
  zumba: 'Zumba',
  spinning: 'Spinning',
  cross_training: 'Cross Training',
  boxing: 'Box',
  functional: 'Funcional',
  stretching: 'Estiramiento',
}

const mockClasses: UpcomingClass[] = [
  {
    class_id: 'class-1',
    class_type: 'yoga',
    class_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    start_time: '07:00',
    duration_minutes: 60,
    instructor_name: 'Ana García',
    location: 'Salón A',
    capacity: 20,
    reservations_count: 15,
    waitlist_count: 0,
    available_spots: 5,
    is_full: false,
    my_status: null,
    my_reservation_id: null,
  },
  {
    class_id: 'class-2',
    class_type: 'spinning',
    class_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    start_time: '18:30',
    duration_minutes: 45,
    instructor_name: 'Carlos López',
    location: 'Salón B',
    capacity: 15,
    reservations_count: 15,
    waitlist_count: 2,
    available_spots: 0,
    is_full: true,
    my_status: null,
    my_reservation_id: null,
  },
  {
    class_id: 'class-3',
    class_type: 'zumba',
    class_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    start_time: '09:00',
    duration_minutes: 50,
    instructor_name: 'María Rodríguez',
    location: 'Salón A',
    capacity: 25,
    reservations_count: 10,
    waitlist_count: 0,
    available_spots: 15,
    is_full: false,
    my_status: 'confirmed',
    my_reservation_id: 'res-003',
  },
]

const mockReservations: Reservation[] = [
  {
    reservation_id: 'res-003',
    student_id: 'dev-student-001',
    class_id: 'class-3',
    class_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    status: 'confirmed',
    created_at: new Date().toISOString(),
    class_type: 'zumba',
    start_time: '09:00',
    instructor_name: 'María Rodríguez',
    location: 'Salón A',
    can_cancel: true,
    cancel_reason: '',
  },
]

type Tab = 'classes' | 'reservations'

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'

  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Schedule(): React.JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('classes')
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['upcoming-classes'],
    queryFn: () => portalApi.getUpcomingClasses(14).then((r) => r.data),
    enabled: !isDev,
  })

  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => portalApi.getReservations().then((r) => r.data),
    enabled: !isDev,
  })

  const enrollMutation = useMutation({
    mutationFn: (classId: string) => portalApi.enrollInClass(classId).then((r) => r.data),
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message })
      queryClient.invalidateQueries({ queryKey: ['upcoming-classes'] })
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
      setEnrollingId(null)
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al inscribirse'
      setFeedback({ type: 'error', message: msg })
      setEnrollingId(null)
      setTimeout(() => setFeedback(null), 4000)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (classId: string) => portalApi.cancelReservation(classId).then((r) => r.data),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Reservación cancelada exitosamente' })
      queryClient.invalidateQueries({ queryKey: ['upcoming-classes'] })
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
      setCancellingId(null)
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al cancelar'
      setFeedback({ type: 'error', message: msg })
      setCancellingId(null)
      setTimeout(() => setFeedback(null), 4000)
    },
  })

  const classes = isDev ? mockClasses : (classesData?.items ?? [])
  const reservations = isDev
    ? mockReservations
    : ((reservationsData?.items ?? []) as Reservation[]).filter(
        (r) => r.status === 'confirmed' || r.status === 'waitlisted'
      )

  const isLoading = activeTab === 'classes' ? classesLoading : reservationsLoading

  if (isLoading && !isDev) {
    return <LoadingState />
  }

  // Group classes by date
  const groupedClasses: Record<string, UpcomingClass[]> = {}
  for (const cls of classes) {
    if (!groupedClasses[cls.class_date]) {
      groupedClasses[cls.class_date] = []
    }
    groupedClasses[cls.class_date].push(cls)
  }

  const handleEnroll = (classId: string): void => {
    setEnrollingId(classId)
    enrollMutation.mutate(classId)
  }

  const handleCancel = (classId: string): void => {
    setCancellingId(classId)
    cancelMutation.mutate(classId)
  }

  return (
    <Container>
      <div style={{ maxWidth: '672px', margin: '0 auto', paddingBottom: '100px' }}>
        <PageHeader title="Clases" onBack={() => navigate('/dashboard')} />

        {/* Feedback banner */}
        {feedback && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '16px',
              marginBottom: '16px',
              background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: feedback.type === 'success' ? '#22c55e' : '#ef4444',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            borderRadius: '16px',
            background: 'rgba(17, 24, 39, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '24px',
          }}
        >
          {(['classes', 'reservations'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === tab ? 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)' : 'transparent',
                color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.5)',
              }}
            >
              {tab === 'classes' ? `Disponibles (${classes.length})` : `Mis Reservaciones (${reservations.length})`}
            </button>
          ))}
        </div>

        {/* Tab: Available Classes */}
        {activeTab === 'classes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.keys(groupedClasses).length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>📅</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    No hay clases disponibles próximamente
                  </p>
                </div>
              </Card>
            ) : (
              Object.entries(groupedClasses).map(([dateStr, dayClasses]) => (
                <div key={dateStr}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#d4af37',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '12px',
                    }}
                  >
                    {formatDateLabel(dateStr)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayClasses.map((cls) => (
                      <ClassCard
                        key={cls.class_id}
                        cls={cls}
                        onEnroll={handleEnroll}
                        onCancel={handleCancel}
                        enrollingId={enrollingId}
                        cancellingId={cancellingId}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: My Reservations */}
        {activeTab === 'reservations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reservations.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>📋</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    No tienes reservaciones activas
                  </p>
                  <button
                    onClick={() => setActiveTab('classes')}
                    style={{
                      marginTop: '16px',
                      padding: '10px 24px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
                      color: '#000',
                      fontWeight: 600,
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Ver clases disponibles
                  </button>
                </div>
              </Card>
            ) : (
              reservations.map((r) => (
                <ReservationCard
                  key={r.reservation_id}
                  reservation={r}
                  onCancel={handleCancel}
                  cancellingId={cancellingId}
                />
              ))
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

// ─── Class Card ──────────────────────────────────────────────────────────────

function ClassCard({
  cls,
  onEnroll,
  onCancel,
  enrollingId,
  cancellingId,
}: {
  cls: UpcomingClass
  onEnroll: (id: string) => void
  onCancel: (id: string) => void
  enrollingId: string | null
  cancellingId: string | null
}): React.JSX.Element {
  const typeName = CLASS_TYPE_LABELS[cls.class_type] || cls.class_type
  const isEnrolling = enrollingId === cls.class_id
  const isCancelling = cancellingId === cls.class_id
  const isEnrolled = cls.my_status === 'confirmed'
  const isWaitlisted = cls.my_status === 'waitlisted'

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: 0 }}>
              {typeName}
            </p>
            {isEnrolled && (
              <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                Inscrito
              </span>
            )}
            {isWaitlisted && (
              <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                En espera
              </span>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 8px 0' }}>
            {cls.start_time?.slice(0, 5)} · {cls.duration_minutes} min · {cls.instructor_name}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>
            📍 {cls.location}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px 0' }}>
            Disponibles
          </p>
          <p
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: cls.is_full ? '#ef4444' : '#22c55e',
              margin: 0,
            }}
          >
            {cls.is_full ? '0' : cls.available_spots}
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
              /{cls.capacity}
            </span>
          </p>
          {cls.waitlist_count > 0 && (
            <p style={{ fontSize: '11px', color: '#f59e0b', margin: '2px 0 0 0' }}>
              {cls.waitlist_count} en espera
            </p>
          )}
        </div>
      </div>

      {/* Action button */}
      <div style={{ marginTop: '12px' }}>
        {isEnrolled ? (
          <button
            onClick={() => onCancel(cls.class_id)}
            disabled={isCancelling}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isCancelling ? 'not-allowed' : 'pointer',
              opacity: isCancelling ? 0.5 : 1,
            }}
          >
            {isCancelling ? 'Cancelando...' : 'Cancelar inscripción'}
          </button>
        ) : isWaitlisted ? (
          <div
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            En lista de espera
          </div>
        ) : (
          <button
            onClick={() => onEnroll(cls.class_id)}
            disabled={isEnrolling}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: cls.is_full
                ? 'rgba(245, 158, 11, 0.15)'
                : 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
              color: cls.is_full ? '#f59e0b' : '#000',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isEnrolling ? 'not-allowed' : 'pointer',
              opacity: isEnrolling ? 0.5 : 1,
            }}
          >
            {isEnrolling
              ? 'Inscribiendo...'
              : cls.is_full
                ? 'Unirse a lista de espera'
                : 'Inscribirme'}
          </button>
        )}
      </div>
    </Card>
  )
}

// ─── Reservation Card ────────────────────────────────────────────────────────

function ReservationCard({
  reservation,
  onCancel,
  cancellingId,
}: {
  reservation: Reservation
  onCancel: (classId: string) => void
  cancellingId: string | null
}): React.JSX.Element {
  const typeName = CLASS_TYPE_LABELS[reservation.class_type || ''] || reservation.class_type || 'Clase'
  const isCancelling = cancellingId === reservation.class_id
  const canCancel = reservation.can_cancel !== false
  const isWaitlisted = reservation.status === 'waitlisted'

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: 0 }}>
              {typeName}
            </p>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: isWaitlisted ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: isWaitlisted ? '#f59e0b' : '#22c55e',
              }}
            >
              {isWaitlisted ? 'En espera' : 'Confirmada'}
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 4px 0' }}>
            {formatDateLabel(reservation.class_date)} · {reservation.start_time?.slice(0, 5) || ''}
          </p>
          {reservation.instructor_name && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 2px 0' }}>
              👤 {reservation.instructor_name}
            </p>
          )}
          {reservation.location && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>
              📍 {reservation.location}
            </p>
          )}
        </div>
      </div>

      {/* Cancel button */}
      {reservation.status === 'confirmed' && (
        <div style={{ marginTop: '12px' }}>
          {canCancel ? (
            <button
              onClick={() => onCancel(reservation.class_id)}
              disabled={isCancelling}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                opacity: isCancelling ? 0.5 : 1,
              }}
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar reservación'}
            </button>
          ) : (
            <div
              style={{
                padding: '10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                textAlign: 'center',
              }}
            >
              {reservation.cancel_reason || 'No se puede cancelar a menos de 2 horas de la clase'}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
