import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes — Fitness Room System",
  description:
    "Respuestas a las preguntas más comunes sobre el sistema de gestión de gimnasio Fitness Room. Check-in, membresías, clases y más.",
};

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[--bg-base]">
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 text-sm text-[--tx-disabled]">
            <Link href="/" className="transition-colors hover:text-[--tx-primary]">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-[--tx-muted]">Preguntas frecuentes</span>
          </div>

          {/* Header */}
          <div className="mb-12">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[--gold]">
              Documentación
            </p>
            <h1 className="text-4xl font-bold text-[--tx-primary]">
              Preguntas Frecuentes
            </h1>
            <p className="mt-4 text-lg text-[--tx-muted]">
              Todo lo que necesitas saber para operar Fitness Room System en tu gimnasio.
              Filtra por categoría para encontrar tu respuesta más rápido.
            </p>
          </div>

          {/* Quick links */}
          <div className="mb-12 grid gap-4 rounded-2xl bg-[--bg-surface] p-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-semibold text-[--tx-primary]">Check-in rápido</p>
                <p className="text-sm text-[--tx-muted]">2 letras y listo</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <p className="font-semibold text-[--tx-primary]">8 tipos de membresía</p>
                <p className="text-sm text-[--tx-muted]">Incluye packs de clases</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">☁️</span>
              <div>
                <p className="font-semibold text-[--tx-primary]">100% en la nube</p>
                <p className="text-sm text-[--tx-muted]">AWS — sin servidor propio</p>
              </div>
            </div>
          </div>

          {/* FAQ component */}
          <FAQ />

          {/* No answer found */}
          <div className="mt-16 rounded-2xl bg-[--bg-surface] p-8 text-center">
            <p className="mb-2 text-lg font-semibold text-[--tx-primary]">
              ¿No encontraste lo que buscabas?
            </p>
            <p className="mb-6 text-[--tx-muted]">
              Revisa el repositorio de GitHub donde encontrarás la documentación técnica completa,
              guías de instalación y arquitectura del sistema.
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
              Ver documentación en GitHub →
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
