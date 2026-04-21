import { Check, Star } from "lucide-react";
import type { DictPricing } from "@/lib/i18n";

const CONTACT_MAILTO =
  "mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información.%0A%0AGracias.";

export function Pricing({ t }: { t: DictPricing }) {
  return (
    <section id="pricing" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            {t.label}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            {t.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[--tx-muted]">
            {t.subtitle}
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {t.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[24px] p-8 transition-all ${
                plan.highlight
                  ? "bg-[--bg-elevated]"
                  : "card-hover"
              }`}
              style={
                plan.highlight
                  ? { boxShadow: "0 0 60px rgba(196,163,79,0.05), 0 0 0 1px rgba(196,163,79,0.1)" }
                  : undefined
              }
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
                    style={{
                      background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                      color: "var(--gold-fg)",
                      boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                    }}
                  >
                    <Star size={12} /> {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan info */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[--tx-primary]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[--tx-muted]">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-[--tx-primary]">{plan.price}</span>
                {plan.period && <span className="text-[--tx-muted]">{plan.period}</span>}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm text-[--tx-muted]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[--gold]" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={CONTACT_MAILTO}
                className={`block rounded-2xl py-3.5 text-center text-sm font-semibold transition-all hover:scale-[1.02] ${
                  plan.highlight ? "" : "text-[--tx-primary]"
                }`}
                style={
                  plan.highlight
                    ? {
                        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                        color: "var(--gold-fg)",
                        boxShadow: "0 8px 30px rgba(196,163,79,0.15)",
                      }
                    : { border: "1px solid rgba(255,255,255,0.06)" }
                }
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <p className="mt-12 text-center text-sm text-[--tx-disabled]">
          {t.guarantee}
        </p>
      </div>
    </section>
  );
}
