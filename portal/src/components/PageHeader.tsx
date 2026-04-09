interface PageHeaderProps {
  title: string
  onBack?: () => void
}

export default function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <header
      style={{
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            color: '#d4af37',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontSize: '16px',
          }}
        >
          ← Volver
        </button>
      )}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#d4af37',
          margin: 0,
        }}
      >
        {title}
      </h1>
    </header>
  )
}
