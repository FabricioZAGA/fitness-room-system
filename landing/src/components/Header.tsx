"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import type { DictNav } from "@/lib/i18n";
import { locales, localeLabels, type Locale } from "@/lib/i18n";

const CONTACT_MAILTO =
  "mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información.%0A%0AGracias.";

interface HeaderProps {
  locale: Locale;
  t: DictNav;
}

export function Header({ locale, t }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const prefix = `/${locale}`;
  const navLinks = [
    { href: `${prefix}/#features`, label: t.features },
    { href: `${prefix}/#pricing`, label: t.pricing },
    { href: `${prefix}/#how-it-works`, label: t.howItWorks },
    { href: `${prefix}/faq/`, label: t.faq },
  ];

  return (
    <header className="glass sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href={`${prefix}/`} className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 4px 20px rgba(196,163,79,0.15)",
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-4 py-2 text-sm text-[--tx-muted] transition-all hover:bg-[--bg-elevated] hover:text-[--tx-primary]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA + Lang */}
        <div className="hidden items-center gap-3 sm:flex">
          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[--tx-muted] transition-all hover:text-[--tx-primary]"
            >
              <Globe size={15} />
              <span>{localeLabels[locale].short}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-xl bg-[--bg-elevated] py-1" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {locales.map((loc) => (
                  <Link
                    key={loc}
                    href={`/${loc}/`}
                    onClick={() => setLangOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      loc === locale ? "text-[--gold]" : "text-[--tx-muted] hover:text-[--tx-primary]"
                    }`}
                  >
                    <span>{localeLabels[loc].flag}</span>
                    <span>{localeLabels[loc].name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <a
            href={CONTACT_MAILTO}
            className="rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 4px 20px rgba(196,163,79,0.15)",
            }}
          >
            {t.requestDemo}
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--bg-surface] text-[--tx-muted] md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="glass animate-fade-in px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-[--tx-muted] transition-all hover:bg-[--bg-elevated] hover:text-[--tx-primary]"
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile lang picker */}
            <div className="mt-3 flex flex-wrap gap-2">
              {locales.map((loc) => (
                <Link
                  key={loc}
                  href={`/${loc}/`}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    loc === locale ? "bg-[--gold-bg] text-[--gold]" : "bg-[--bg-surface] text-[--tx-muted]"
                  }`}
                >
                  {localeLabels[loc].flag} {localeLabels[loc].short}
                </Link>
              ))}
            </div>

            <a
              href={CONTACT_MAILTO}
              className="mt-3 rounded-2xl px-5 py-3 text-center text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              {t.requestDemo}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
