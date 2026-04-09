import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'gold'
  fullWidth?: boolean
}

export default function Button({ children, onClick, variant = 'primary', fullWidth = false }: ButtonProps) {
  const getStyles = () => {
    switch (variant) {
      case 'gold':
        return {
          background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
          color: '#000000',
          border: 'none',
        }
      case 'secondary':
        return {
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }
      default:
        return {
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          color: '#ffffff',
          border: 'none',
        }
    }
  }

  return (
    <button
      onClick={onClick}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '16px 32px',
        borderRadius: '16px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        ...getStyles(),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}
    >
      {children}
    </button>
  )
}
