interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'gold' | 'gradient'
  onClick?: () => void
  style?: React.CSSProperties
}

export default function Card({ children, variant = 'default', onClick, style }: CardProps) {
  const getBackground = () => {
    switch (variant) {
      case 'gold':
        return 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
      case 'gradient':
        return 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'
      default:
        return 'rgba(17, 24, 39, 0.8)'
    }
  }

  const getBorder = () => {
    switch (variant) {
      case 'gold':
        return '1px solid rgba(212, 175, 55, 0.3)'
      case 'gradient':
        return '1px solid rgba(168, 85, 247, 0.3)'
      default:
        return '1px solid rgba(255, 255, 255, 0.1)'
    }
  }

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: '24px',
        border: getBorder(),
        background: getBackground(),
        padding: '24px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(212, 175, 55, 0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      {children}
    </div>
  )
}
