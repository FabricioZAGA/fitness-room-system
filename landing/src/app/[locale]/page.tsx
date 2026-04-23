import Link from "next/link";
import { locales, getDictionary, isValidLocale, type Locale } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

const CONTACT_MAILTO =
  "mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información.%0A%0AGracias.";

export function generateStaticParams(): { locale: string }[] {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isValidLocale(raw) ? raw : "es";
  const d = getDictionary(locale);
  return { title: d.meta.title, description: d.meta.description };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isValidLocale(raw) ? raw : "es";
  const d = getDictionary(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fitness Room System",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `https://platform.fitnessroom.mx/${locale}`,
    inLanguage: locale,
    description: d.meta.description,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "MXN",
      lowPrice: "2499",
      highPrice: "4999",
      offerCount: "3",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "3",
    },
  };

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header locale={locale} t={d.nav} />
      <main>
        <Hero t={d.hero} />
        <Features t={d.features} />

        <div className="spacer my-4" />

        <Pricing t={d.pricing} />
        <HowItWorks t={d.howItWorks} />
        <Testimonials t={d.testimonials} />

        {/* FAQ Preview */}
        <section id="faq" className="px-6 py-28">
          <div className="mx-auto max-w-4xl">
            <div className="mb-16 text-center">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
                {d.faqSection.label}
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
                {d.faqSection.title}
              </h2>
            </div>

            <FAQ t={d.faqData} preview />

            <div className="mt-10 text-center">
              <Link
                href={`/${locale}/faq/`}
                className="inline-flex items-center gap-2 rounded-2xl bg-[--bg-surface] px-6 py-3 text-sm font-semibold text-[--tx-primary] transition-all hover:bg-[--bg-elevated]"
              >
                {d.faqSection.viewAll}
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="contact" className="relative overflow-hidden px-6 py-28">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(196,163,79,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
              {d.cta.title}
              <span className="gradient-text">{d.cta.highlight}</span>?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-[--tx-muted]">
              {d.cta.subtitle}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href={CONTACT_MAILTO}
                className="w-full rounded-2xl px-10 py-4 text-base font-semibold transition-all hover:scale-[1.02] sm:w-auto"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 40px rgba(196,163,79,0.2)",
                }}
              >
                {d.cta.ctaPrimary}
              </a>
              <Link
                href={`/${locale}/faq/`}
                className="w-full rounded-2xl px-10 py-4 text-base font-semibold text-[--tx-primary] transition-all hover:bg-[--bg-elevated] sm:w-auto"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {d.cta.ctaSecondary}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} t={d.footer} nav={d.nav} />
    </div>
  );
}
