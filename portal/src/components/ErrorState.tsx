interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export default function ErrorState({
  title = 'Ocurrió un error',
  message = 'No pudimos cargar la información. Verifica tu conexión e intenta de nuevo.',
  onRetry,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          fontSize: '24px',
        }}
      >
        ⚠️
      </div>
      <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          margin: '0 0 20px 0',
          maxWidth: '300px',
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '12px 28px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #d4af37, #f59e0b)',
            color: '#000000',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
