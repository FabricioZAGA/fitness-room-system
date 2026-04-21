import { UserPlus, CalendarCheck, ScanLine, ArrowRight, type LucideIcon } from "lucide-react";

interface Step {
  number: string;
  title: string;
  description: string;
  details: string[];
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: UserPlus,
    title: "Registra a tus miembros",
    description:
      "Agrega nombre, correo y teléfono. Asigna la membresía y el sistema calcula fechas de vencimiento automáticamente.",
    details: ["Datos completos + contacto de emergencia", "Membresía con cálculo automático de fechas", "Carta responsiva en PDF"],
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Gestiona tus clases",
    description:
      "Programa clases con instructor, horario y capacidad. Lista de espera automática cuando se llena la clase.",
    details: ["Zumba, Pilates, Yoga, Spinning y más", "Capacidad máxima configurable", "Lista de espera inteligente"],
  },
  {
    number: "03",
    icon: ScanLine,
    title: "Check-in en 2 segundos",
    description:
      "El recepcionista escribe 2 letras y aparece el miembro. Un clic registra la entrada con validación en tiempo real.",
    details: ["Búsqueda instantánea", "Validación de membresía activa", "QR o búsqueda manual"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            Cómo funciona
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            Listo en 3 pasos
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[--tx-muted]">
            Sin instalación, sin servidores. Tu gym operando en minutos.
          </p>
        </div>

        {/* Steps grid */}
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-3">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="relative">
                {/* Connector arrow (desktop) */}
                {idx < STEPS.length - 1 && (
                  <div className="absolute -right-4 top-14 z-10 hidden text-[--tx-disabled] lg:block">
                    <ArrowRight size={20} />
                  </div>
                )}

                {/* Card */}
                <div className="card-hover rounded-[20px] border border-[--bd-default] bg-[--bg-surface] p-8">
                  {/* Number + Icon row */}
                  <div className="mb-6 flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold"
                      style={{
                        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                        color: "var(--gold-fg)",
                        boxShadow: "0 8px 30px rgba(212,175,55,0.2)",
                      }}
                    >
                      {step.number}
                    </div>
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-bd)" }}
                    >
                      <step.icon size={18} className="text-[--gold]" />
                    </div>
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-[--tx-primary]">
                    {step.title}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-[--tx-muted]">
                    {step.description}
                  </p>

                  <ul className="space-y-2.5">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2.5 text-sm text-[--tx-muted]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[--gold]" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
