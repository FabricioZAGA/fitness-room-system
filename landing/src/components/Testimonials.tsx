import { Star } from "lucide-react";
import type { DictTestimonials } from "@/lib/i18n";

export function Testimonials({ t }: { t: DictTestimonials }) {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            {t.label}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            {t.title}
          </h2>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {t.items.map((item) => (
            <div
              key={item.name}
              className="card-hover flex flex-col rounded-[20px] p-8"
            >
              {/* Stars */}
              <div className="mb-5 flex gap-1">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} size={16} className="fill-[--gold] text-[--gold]" />
                ))}
              </div>

              {/* Quote */}
              <p className="mb-6 flex-1 text-base leading-relaxed text-[--tx-muted]">
                &ldquo;{item.quote}&rdquo;
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
                  {item.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[--tx-primary]">{item.name}</p>
                  <p className="text-xs text-[--tx-disabled]">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
