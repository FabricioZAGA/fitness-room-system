import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0a0a0a',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            fontSize: '28px',
          }}
        >
          ⚠️
        </div>
        <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>
          Algo salió mal
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 24px 0', maxWidth: '320px' }}>
          Ocurrió un error inesperado. Intenta recargar la página.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '12px',
              maxWidth: '400px',
              overflow: 'auto',
              textAlign: 'left',
              marginBottom: '24px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </pre>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #d4af37, #f59e0b)',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      </div>
    )
  }
}
