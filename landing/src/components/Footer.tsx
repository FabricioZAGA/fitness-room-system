import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import type { DictFooter, DictNav, Locale } from "@/lib/i18n";

interface FooterProps {
  locale: Locale;
  t: DictFooter;
  nav: DictNav;
}

export function Footer({ locale, t, nav }: FooterProps) {
  const prefix = `/${locale}`;
  const productLinks = [
    { href: `${prefix}/#features`, label: nav.features },
    { href: `${prefix}/#pricing`, label: nav.pricing },
    { href: `${prefix}/#how-it-works`, label: nav.howItWorks },
    { href: `${prefix}/faq/`, label: nav.faq },
  ];
  const resourceLinks = [
    { href: "https://github.com/FabricioZAGA/fitness-room-system", label: "GitHub", external: true },
    { href: "mailto:fabricio@devzaga.com", label: "Contacto", external: true },
  ];

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
                  boxShadow: "0 4px 20px rgba(196,163,79,0.15)",
                }}
              >
                FR
              </div>
              <span className="text-lg font-bold text-[--tx-primary]">
                Fitness <span className="gradient-text">Room</span>
              </span>
            </div>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-[--tx-muted]">
              {t.description}
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

          {/* Product links */}
          <div>
            <p className="mb-4 text-sm font-semibold text-[--tx-primary]">{t.productLabel}</p>
            <nav className="flex flex-col gap-2.5 text-sm">
              {productLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Resource links */}
          <div>
            <p className="mb-4 text-sm font-semibold text-[--tx-primary]">{t.resourcesLabel}</p>
            <nav className="flex flex-col gap-2.5 text-sm">
              {resourceLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="text-[--tx-muted] transition-colors hover:text-[--tx-primary]">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 pt-8 text-xs text-[--tx-disabled] sm:flex-row">
          <p>{t.copyright}</p>
          <p>
            {t.techStack} ·{" "}
            <span className="text-[--gold]">Serverless</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
