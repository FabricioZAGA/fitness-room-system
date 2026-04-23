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
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="rounded-lg border border-[--bd-default] bg-[--bg-base] px-5 py-2 text-sm font-semibold text-[--tx-primary] transition-all hover:bg-[--bg-elevated]"
              >
                Ir al inicio
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg px-5 py-2 text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)"
                }}
              >
                Recargar página
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-[--tx-disabled]">
                  Ver detalles del error
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-[--bg-base] p-4 text-xs text-[--tx-muted]">
                  {this.state.error.toString()}
                  {"\n"}
                  {this.state.error.stack}
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
