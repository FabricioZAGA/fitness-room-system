import { useQuery } from '@tanstack/react-query'
import {
  portalApi,
  type AccountEntry,
  type Profile,
  type StudentProfile,
  type StaffProfile,
} from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Container, Card, PageHeader, LoadingState, ErrorState } from '../components'

const CONCEPT_LABELS: Record<string, string> = {
  membership: 'Membresía',
  class_pack: 'Paquete de clases',
  product: 'Producto',
  other: 'Otro cargo',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
}

const money = (n: number): string =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const isDev = import.meta.env.DEV

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

export default function Profile(): React.JSX.Element {
  const navigate = useNavigate()
  
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: () => portalApi.getProfile().then((res) => res.data),
    enabled: !isDev,
  })
  const { data: accountData } = useQuery({
    queryKey: ['account'],
    queryFn: () => portalApi.getAccount().then((res) => res.data),
    enabled: !isDev,
  })
  const account = accountData?.account ?? null

  if (isError && !isDev) {
    return <ErrorState title="Error al cargar perfil" onRetry={() => refetch()} />
  }

  const displayProfile = isDev ? mockProfile : profile
  const role = displayProfile?.role || 'student'

  if (isLoading && !isDev) {
    return <LoadingState />
  }

  const isStudent = role === 'student'
  const userId = isStudent
    ? (displayProfile as StudentProfile | undefined)?.student_id
    : (displayProfile as StaffProfile | undefined)?.instructor_id
  const specialties = !isStudent ? (displayProfile as StaffProfile | undefined)?.specialties : null
  const bio = !isStudent ? (displayProfile as StaffProfile | undefined)?.bio : null

  return (
    <Container>
      <div style={{ maxWidth: '448px', margin: '0 auto' }}>
        <PageHeader title="Mi Perfil" onBack={() => navigate('/dashboard')} />

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              margin: '0 auto',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {displayProfile?.photo_url ? (
              <img
                src={displayProfile.photo_url}
                alt={displayProfile?.first_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#000000',
                }}
              >
                {displayProfile?.first_name?.[0]?.toUpperCase()}
                {displayProfile?.last_name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '18px', margin: '12px 0 0' }}>
            {displayProfile?.first_name} {displayProfile?.last_name}
          </p>
        </div>

        <Card>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              Rol
            </label>
            <p style={{ color: '#d4af37', fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>
              {isStudent ? 'Estudiante' : 'Instructor'}
            </p>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
              ID
            </label>
            <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>
              {userId}
            </p>
          </div>
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
          {specialties && (
            <div>
              <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Especialidades
              </label>
              <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {specialties?.join(', ') || 'No registradas'}
              </p>
            </div>
          )}
          {bio && (
            <div>
              <label style={{ fontSize: '14px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Biografía
              </label>
              <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>
                {bio}
              </p>
            </div>
          )}
          {isDev && (
            <p style={{ fontSize: '12px', color: '#facc15', marginTop: '16px' }}>
              ⚠️ Modo desarrollo - Datos de prueba
            </p>
          )}
        </Card>

        {isStudent && account && (
          <div style={{ marginTop: '16px' }}>
            <Card variant="gold">
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '16px', margin: '0 0 12px' }}>
                Mis compras y pagos
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px' }}>Saldo a favor</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', margin: 0 }}>
                    {money(account.current_balance)}
                  </p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px' }}>Por pagar</p>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: account.total_pending > 0 ? '#ef4444' : '#ffffff',
                      margin: 0,
                    }}
                  >
                    {money(account.total_pending)}
                  </p>
                </div>
              </div>
              {account.total_pending > 0 && (
                <p style={{ fontSize: '12px', color: '#fca5a5', margin: '0 0 12px' }}>
                  Tienes cargos pendientes de pago. Pasa a recepción para liquidarlos.
                </p>
              )}
              {account.entries.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Aún no tienes movimientos.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {account.entries.slice(0, 20).map((e) => (
                    <AccountRow key={e.entry_id} entry={e} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </Container>
  )
}

function AccountRow({ entry: e }: { entry: AccountEntry }): React.JSX.Element {
  const isDeposit = e.kind === 'deposit'
  const pending = e.status === 'pending'
  const details: string[] = []
  if (e.paid_now > 0 && e.payment_method) details.push(`${METHOD_LABELS[e.payment_method] ?? e.payment_method} ${money(e.paid_now)}`)
  if (e.paid_with_balance > 0) details.push(`Saldo ${money(e.paid_with_balance)}`)
  const label = isDeposit ? 'Abono' : (CONCEPT_LABELS[e.concept_type ?? ''] ?? 'Cargo')
  const color = pending ? '#ef4444' : isDeposit ? '#10b981' : '#ffffff'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        background: pending ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.04)',
        border: pending ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {e.description}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '12px', margin: '2px 0 0' }}>
          {label} · {shortDate(e.date)}
          {details.length > 0 ? ` · ${details.join(' · ')}` : ''}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ color, fontWeight: 700, fontSize: '14px', margin: 0 }}>
          {isDeposit ? '+' : ''}{money(pending ? e.pending_amount : e.amount)}
        </p>
        <p style={{ color, fontSize: '11px', margin: '2px 0 0' }}>
          {pending ? 'Pendiente' : isDeposit ? 'Abono' : 'Pagado'}
        </p>
      </div>
    </div>
  )
}
