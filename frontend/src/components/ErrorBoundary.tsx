import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[--bg-base] p-6">
          <div className="max-w-md rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-8 text-center">
            <h1 className="mb-4 text-2xl font-bold text-[--tx-primary]">
              Algo salió mal
            </h1>
            <p className="mb-6 text-[--tx-muted]">
              Ha ocurrido un error inesperado. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg px-6 py-2 text-base font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
            >
              Recargar página
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-[--tx-disabled]">
                  Ver detalles del error
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-[--bg-base] p-4 text-xs text-[--tx-muted]">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
