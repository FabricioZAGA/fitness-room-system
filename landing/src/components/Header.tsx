import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[--bd-default] bg-[--bg-base]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
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
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/#features" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
            Funciones
          </Link>
          <Link href="/#how-it-works" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
            Cómo funciona
          </Link>
          <Link href="/faq" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
            Preguntas frecuentes
          </Link>
        </nav>

        {/* CTA */}
        <a
          href="mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información%20sobre%3A%0A-%20Precios%0A-%20Implementación%0A-%20Soporte%0A%0AGracias."
          className="hidden rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:block"
          style={{ backgroundColor: "var(--gold)", color: "var(--gold-fg)" }}
        >
          Contactar
        </a>
      </div>
    </header>
  );
}
