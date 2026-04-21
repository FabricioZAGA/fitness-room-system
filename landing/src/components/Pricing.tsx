import { Check, Star } from "lucide-react";

const CONTACT_MAILTO =
  "mailto:fabricio@devzaga.com?subject=Interesado%20en%20Fitness%20Room%20System&body=Hola%2C%0A%0AEstoy%20interesado%20en%20implementar%20Fitness%20Room%20System%20en%20mi%20gimnasio.%0A%0APor%20favor%20comparteme%20más%20información.%0A%0AGracias.";

interface Plan {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    description: "Para gimnasios pequeños que inician su digitalización",
    price: "$2,499",
    period: "/mes MXN",
    cta: "Comenzar",
    features: [
      "Hasta 100 alumnos activos",
      "Check-in y membresías",
      "Clases grupales básicas",
      "1 usuario administrador",
      "Soporte por email",
    ],
  },
  {
    name: "Professional",
    description: "Todo lo que necesitas para operar sin límites",
    price: "$4,999",
    period: "/mes MXN",
    highlight: true,
    badge: "Más popular",
    cta: "Elegir plan",
    features: [
      "Alumnos ilimitados",
      "Check-in + QR kiosco",
      "Portal del alumno",
      "Reportes Excel + PDF",
      "Notificaciones por email",
      "3 usuarios administradores",
      "Modo oscuro y claro",
      "Soporte prioritario",
    ],
  },
  {
    name: "Enterprise",
    description: "Para cadenas y estudios con múltiples sucursales",
    price: "Personalizado",
    period: "",
    cta: "Contactar",
    features: [
      "Todo en Professional",
      "Multi-sucursal",
      "API personalizada",
      "Usuarios admin ilimitados",
      "Integración WhatsApp",
      "SLA garantizado",
      "Soporte dedicado 24/7",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            Precios
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            Simple y transparente
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[--tx-muted]">
            Sin contratos largos. Sin costos ocultos. Cancela cuando quieras.
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[24px] border p-8 transition-all ${
                plan.highlight
                  ? "border-[--gold-bd] bg-[--bg-elevated]"
                  : "border-[--bd-default] bg-[--bg-surface]"
              }`}
              style={
                plan.highlight
                  ? { boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 0 0 1px rgba(212,175,55,0.12)" }
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
                  plan.highlight ? "" : "border border-[--bd-default] text-[--tx-primary] hover:border-[--gold-bd]"
                }`}
                style={
                  plan.highlight
                    ? {
                        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                        color: "var(--gold-fg)",
                        boxShadow: "0 8px 30px rgba(212,175,55,0.2)",
                      }
                    : undefined
                }
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <p className="mt-12 text-center text-sm text-[--tx-disabled]">
          14 días de prueba gratis en todos los planes. Sin tarjeta de crédito.
        </p>
      </div>
    </section>
  );
}
