import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import Link from "next/link";

const CONTACT_MAILTO =
  "mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información.%0A%0AGracias.";

export default function HomePage() {
  return (
    <div className="noise min-h-screen bg-[--bg-base]">
      <Header />
      <main>
        <Hero />
        <Features />

        {/* Gradient divider */}
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="h-px"
            style={{
              background: "linear-gradient(90deg, transparent, var(--gold-bd), transparent)",
            }}
          />
        </div>

        <Pricing />
        <HowItWorks />
        <Testimonials />

        {/* FAQ Preview */}
        <section id="faq" className="px-6 py-28">
          <div className="mx-auto max-w-4xl">
            <div className="mb-16 text-center">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
                Preguntas frecuentes
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
                Resolvemos tus dudas
              </h2>
            </div>

            <FAQ preview />

            <div className="mt-10 text-center">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 rounded-2xl border border-[--bd-default] bg-[--bg-surface] px-6 py-3 text-sm font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd]"
              >
                Ver todas las preguntas →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="contact" className="relative overflow-hidden px-6 py-28">
          {/* Background glow */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(212,175,55,0.1) 0%, transparent 70%)",
            }}
          />

          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
              ¿Listo para transformar{" "}
              <span className="gradient-text">tu gimnasio</span>?
            </h2>
            <p className="mb-12 text-lg text-[--tx-muted]">
              14 días de prueba gratis. Sin tarjeta de crédito. Sin compromisos.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href={CONTACT_MAILTO}
                className="w-full rounded-2xl px-10 py-4 text-base font-semibold transition-all hover:scale-[1.02] sm:w-auto"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 40px rgba(212,175,55,0.25)",
                }}
              >
                Solicitar demo gratis
              </a>
              <Link
                href="/faq"
                className="w-full rounded-2xl border border-[--bd-default] bg-[--bg-surface] px-10 py-4 text-base font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd] sm:w-auto"
              >
                Más información
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
