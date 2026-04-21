import { Star } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Karina G.",
    role: "Dueña — Fitness Room MX",
    quote:
      "Por fin un sistema que entiende cómo opera un gym en México. El check-in es rapidísimo y mis recepcionistas lo aprendieron en 10 minutos.",
    rating: 5,
  },
  {
    name: "Roberto M.",
    role: "Administrador — CrossFit Studio",
    quote:
      "Las alertas de membresía por vencer nos ayudaron a recuperar alumnos que antes se nos iban sin renovar. Fácil +15% de retención.",
    rating: 5,
  },
  {
    name: "Daniela P.",
    role: "Instructora — Yoga & Pilates",
    quote:
      "Me encanta ver mis clases organizadas, saber cuántos alumnos vienen y que la lista de espera funcione sola. Todo en mi celular.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            Testimonios
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            Lo que dicen nuestros usuarios
          </h2>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="card-hover flex flex-col rounded-[20px] p-8"
            >
              {/* Stars */}
              <div className="mb-5 flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={16} className="fill-[--gold] text-[--gold]" />
                ))}
              </div>

              {/* Quote */}
              <p className="mb-6 flex-1 text-base leading-relaxed text-[--tx-muted]">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                    color: "var(--gold-fg)",
                  }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[--tx-primary]">{t.name}</p>
                  <p className="text-xs text-[--tx-disabled]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
