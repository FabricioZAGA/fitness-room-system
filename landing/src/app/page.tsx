import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[--bg-base]">
      <Header />
      <main>
        <Hero />

        {/* Divider */}
        <div className="mx-auto h-px max-w-6xl bg-[--bd-default] px-6" />

        <Features />

        {/* Divider */}
        <div className="mx-auto h-px max-w-6xl bg-[--bd-default] px-6" />

        <HowItWorks />

        {/* FAQ Preview */}
        <section id="faq" className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[--gold]">
                Preguntas frecuentes
              </p>
              <h2 className="text-3xl font-bold text-[--tx-primary] sm:text-4xl">
                Resolvemos tus dudas
              </h2>
            </div>

            <FAQ preview />

            <div className="mt-8 text-center">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-surface] px-6 py-3 text-sm font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd]"
              >
                Ver todas las preguntas →
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section
          id="contact"
          className="px-6 py-24"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, transparent 60%)",
          }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-[--tx-primary] sm:text-4xl">
              ¿Listo para modernizar tu gimnasio?
            </h2>
            <p className="mb-10 text-lg text-[--tx-muted]">
              Fitness Room System está disponible para instalación en AWS. Contacta al equipo
              para conocer los detalles de implementación y soporte.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="https://github.com/FabricioZAGA/fitness-room-system"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl px-8 py-4 text-base font-semibold transition-all sm:w-auto"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 30px rgba(212,175,55,0.25)",
                }}
              >
                Ver en GitHub
              </a>
              <a
                href="mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información%20sobre%3A%0A-%20Precios%0A-%20Implementación%0A-%20Soporte%0A%0AGracias."
                className="w-full rounded-xl border-2 border-[--gold-bd] bg-[--gold-bg] px-8 py-4 text-base font-semibold text-[--gold] transition-all hover:bg-[--gold] hover:text-[--gold-fg] sm:w-auto"
              >
                Contactar
              </a>
              <Link
                href="/faq"
                className="w-full rounded-xl border border-[--bd-default] bg-[--bg-surface] px-8 py-4 text-base font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd] sm:w-auto"
              >
                Leer documentación
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
