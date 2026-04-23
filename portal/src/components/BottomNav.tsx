import { useNavigate, useLocation } from 'react-router-dom'
import { useRole } from '../hooks/useRole'

interface NavItem {
  path: string
  label: string
  icon: string
  roles?: Array<'student' | 'staff'>
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Inicio', icon: '🏠' },
  { path: '/schedule', label: 'Clases', icon: '📅' },
  { path: '/qr', label: 'QR', icon: '📱', roles: ['student'] },
  { path: '/profile', label: 'Perfil', icon: '👤' },
]

export default function BottomNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const role = useRole()

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
        zIndex: 50,
      }}
    >
      {visibleItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '6px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                filter: isActive ? 'none' : 'grayscale(1) opacity(0.5)',
                transition: 'filter 0.2s ease',
              }}
            >
              {item.icon}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#d4af37' : 'rgba(255, 255, 255, 0.4)',
                transition: 'color 0.2s ease',
              }}
            >
              {item.label}
            </span>
            {isActive && (
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#d4af37',
                  marginTop: '2px',
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
