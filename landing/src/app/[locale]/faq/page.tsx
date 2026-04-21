import type { Metadata } from "next";
import Link from "next/link";
import { locales, getDictionary, isValidLocale, type Locale } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export function generateStaticParams(): { locale: string }[] {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isValidLocale(raw) ? raw : "es";
  const d = getDictionary(locale);
  return {
    title: `${d.faqPage.title} — Fitness Room System`,
    description: d.faqPage.subtitle,
  };
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isValidLocale(raw) ? raw : "es";
  const d = getDictionary(locale);

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <Header locale={locale} t={d.nav} />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 text-sm text-[--tx-disabled]">
            <Link href={`/${locale}/`} className="transition-colors hover:text-[--tx-primary]">
              {d.faqPage.breadcrumbHome}
            </Link>
            <span>/</span>
            <span className="text-[--tx-muted]">{d.faqPage.breadcrumbFaq}</span>
          </div>

          {/* Header */}
          <div className="mb-12">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[--gold]">
              {d.faqPage.docLabel}
            </p>
            <h1 className="text-4xl font-bold text-[--tx-primary]">
              {d.faqPage.title}
            </h1>
            <p className="mt-4 text-lg text-[--tx-muted]">
              {d.faqPage.subtitle}
            </p>
          </div>

          {/* Quick links */}
          <div className="mb-12 grid gap-4 rounded-2xl bg-[--bg-surface] p-6 sm:grid-cols-3">
            {d.faqPage.quickLinks.map((ql) => (
              <div key={ql.title} className="flex items-start gap-3">
                <span className="text-2xl">{ql.emoji}</span>
                <div>
                  <p className="font-semibold text-[--tx-primary]">{ql.title}</p>
                  <p className="text-sm text-[--tx-muted]">{ql.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ component */}
          <FAQ t={d.faqData} />

          {/* No answer found */}
          <div className="mt-16 rounded-2xl bg-[--bg-surface] p-8 text-center">
            <p className="mb-2 text-lg font-semibold text-[--tx-primary]">
              {d.faqPage.notFoundTitle}
            </p>
            <p className="mb-6 text-[--tx-muted]">
              {d.faqPage.notFoundDesc}
            </p>
            <a
              href="https://github.com/FabricioZAGA/fitness-room-system"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              {d.faqPage.notFoundCta}
            </a>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={d.footer} nav={d.nav} />
    </div>
  );
}
