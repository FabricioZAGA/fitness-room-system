import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[--bd-default] bg-[--bg-surface] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                FR
              </div>
              <span className="text-lg font-bold text-[--tx-primary]">Fitness Room</span>
            </div>
            <p className="max-w-xs text-sm text-[--tx-muted]">
              Sistema de gestión para gimnasios y estudios de fitness. Hecho en México.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-2 text-sm sm:items-end">
            <Link href="/#features" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
              Funcionalidades
            </Link>
            <Link href="/#how-it-works" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
              Cómo funciona
            </Link>
            <Link href="/faq" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
              Preguntas frecuentes
            </Link>
            <a
              href="https://github.com/FabricioZAGA/fitness-room-system"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]"
            >
              GitHub →
            </a>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[--bd-default] pt-8 text-xs text-[--tx-disabled] sm:flex-row">
          <p>© 2026 Fitness Room. Todos los derechos reservados.</p>
          <p>
            Construido con React 19, FastAPI, AWS Lambda y DynamoDB.{" "}
            <span style={{ color: "var(--gold)" }}>Serverless.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
