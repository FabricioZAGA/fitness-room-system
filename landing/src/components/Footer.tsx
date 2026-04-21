import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";

const LINKS = {
  Producto: [
    { href: "/#features", label: "Funciones" },
    { href: "/#pricing", label: "Precios" },
    { href: "/#how-it-works", label: "Cómo funciona" },
    { href: "/faq", label: "FAQ" },
  ],
  Recursos: [
    { href: "https://github.com/FabricioZAGA/fitness-room-system", label: "GitHub", external: true },
    { href: "mailto:fabricio@devzaga.com", label: "Contacto", external: true },
  ],
};

export function Footer() {
  return (
    <footer className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 4px 20px rgba(212,175,55,0.15)",
                }}
              >
                FR
              </div>
              <span className="text-lg font-bold text-[--tx-primary]">
                Fitness <span className="gradient-text">Room</span>
              </span>
            </div>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-[--tx-muted]">
              Sistema integral de gestión para gimnasios y estudios de fitness.
              Diseñado en México, corriendo en AWS.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/FabricioZAGA/fitness-room-system"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--bg-surface] text-[--tx-muted] transition-all hover:text-[--gold]"
              >
                <ExternalLink size={18} />
              </a>
              <a
                href="mailto:fabricio@devzaga.com"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--bg-surface] text-[--tx-muted] transition-all hover:text-[--gold]"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="mb-4 text-sm font-semibold text-[--tx-primary]">{title}</p>
              <nav className="flex flex-col gap-2.5 text-sm">
                {links.map((link) =>
                  "external" in link ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 pt-8 text-xs text-[--tx-disabled] sm:flex-row">
          <p>© 2026 Fitness Room. Todos los derechos reservados.</p>
          <p>
            React 19 · FastAPI · AWS Lambda · DynamoDB ·{" "}
            <span className="text-[--gold]">Serverless</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
