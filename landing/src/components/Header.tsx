"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/#features", label: "Funciones" },
  { href: "/#pricing", label: "Precios" },
  { href: "/#how-it-works", label: "Cómo funciona" },
  { href: "/faq", label: "FAQ" },
];

const CONTACT_MAILTO =
  "mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información.%0A%0AGracias.";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 border-b border-[--bd-default]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 4px 20px rgba(212,175,55,0.2)",
            }}
          >
            FR
          </div>
          <span className="text-lg font-bold text-[--tx-primary]">
            Fitness <span className="gradient-text">Room</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-4 py-2 text-sm text-[--tx-muted] transition-all hover:bg-[--bg-elevated] hover:text-[--tx-primary]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 sm:flex">
          <a
            href={CONTACT_MAILTO}
            className="rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 4px 20px rgba(212,175,55,0.15)",
            }}
          >
            Solicitar demo
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[--bd-default] text-[--tx-muted] md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="glass animate-fade-in border-t border-[--bd-default] px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-[--tx-muted] transition-all hover:bg-[--bg-elevated] hover:text-[--tx-primary]"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={CONTACT_MAILTO}
              className="mt-3 rounded-2xl px-5 py-3 text-center text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              Solicitar demo
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
