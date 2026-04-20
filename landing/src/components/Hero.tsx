import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[--gold-bd] bg-[--gold-bg] px-4 py-1.5 text-sm font-medium text-[--gold]">
        <span className="h-1.5 w-1.5 rounded-full bg-[--gold]" />
        Fase 1 completada — Listo para producción
      </div>

      {/* Headline */}
      <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-[--tx-primary] sm:text-5xl lg:text-6xl">
        El sistema de gestión para{" "}
        <span style={{ color: "var(--gold)" }}>tu gimnasio</span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-[--tx-muted]">
        Control total de membresías, check-in de acceso, clases grupales e instructores.
        Diseñado para estudios de fitness en México. Simple, rápido y serverless.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <a
          href="#features"
          className="w-full rounded-xl px-8 py-4 text-base font-semibold transition-all hover:shadow-lg sm:w-auto"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            color: "var(--gold-fg)",
            boxShadow: "0 10px 30px rgba(212,175,55,0.25)",
          }}
        >
          Ver funcionalidades
        </a>
        <Link
          href="/faq"
          className="w-full rounded-xl border border-[--bd-default] bg-[--bg-surface] px-8 py-4 text-base font-semibold text-[--tx-primary] transition-all hover:border-[--gold-bd] sm:w-auto"
        >
          Preguntas frecuentes →
        </Link>
      </div>

      {/* Stats */}
      <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6">
        {[
          { value: "100%", label: "Serverless" },
          { value: "7", label: "Módulos completos" },
          { value: "2", label: "Idiomas" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-bold" style={{ color: "var(--gold)" }}>
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-[--tx-muted]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
