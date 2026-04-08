const STEPS = [
  {
    number: "01",
    title: "Registra a tus miembros",
    description:
      "Agrega nombre, correo y teléfono. Asigna el tipo de membresía: mensual, trimestral o paquete de clases. El sistema calcula fechas de vencimiento automáticamente.",
    details: ["Nombre completo y contacto", "Tipo de membresía con fecha automática", "Estado inicial: Nuevo → Activo"],
  },
  {
    number: "02",
    title: "Gestiona tus clases",
    description:
      "Programa clases con tipo (Zumba, Pilates, Yoga…), instructor, fecha, hora y capacidad. Los miembros se agregan a la clase o quedan en lista de espera.",
    details: ["Instructor asignado", "Capacidad máxima configurable", "Lista de espera automática"],
  },
  {
    number: "03",
    title: "Check-in rápido en recepción",
    description:
      "Al llegar el miembro, el recepcionista escribe su nombre. En 2 segundos aparece el estado: acceso permitido, membresía por vencer o acceso denegado.",
    details: ["Búsqueda por nombre o correo", "Validación en tiempo real", "Registro automático de entrada"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[--gold]">
            Flujo de trabajo
          </p>
          <h2 className="text-3xl font-bold text-[--tx-primary] sm:text-4xl">
            Así funciona en el día a día
          </h2>
        </div>

        {/* Steps */}
        <div className="grid gap-8 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="relative">
              {/* Step number */}
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                }}
              >
                {step.number}
              </div>

              <h3 className="mb-3 text-xl font-semibold text-[--tx-primary]">
                {step.title}
              </h3>
              <p className="mb-4 text-[--tx-muted]">{step.description}</p>

              <ul className="space-y-2">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-sm text-[--tx-muted]">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--gold)" }}
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Membership types */}
        <div className="mt-20 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-8">
          <h3 className="mb-6 text-center text-xl font-semibold text-[--tx-primary]">
            Tipos de membresía disponibles
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { type: "Mensual", detail: "30 días", icon: "📅" },
              { type: "Trimestral", detail: "90 días", icon: "📆" },
              { type: "Semestral", detail: "180 días", icon: "🗓️" },
              { type: "Anual", detail: "365 días", icon: "🏆" },
              { type: "Pack 5 clases", detail: "5 sesiones", icon: "5️⃣" },
              { type: "Pack 10 clases", detail: "10 sesiones", icon: "🔟" },
              { type: "Pack 20 clases", detail: "20 sesiones", icon: "2️⃣0️⃣" },
              { type: "Día suelto", detail: "Acceso de 1 día", icon: "☀️" },
            ].map((m) => (
              <div
                key={m.type}
                className="flex items-center gap-3 rounded-xl border border-[--bd-default] p-3"
              >
                <span className="text-xl">{m.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[--tx-primary]">{m.type}</p>
                  <p className="text-xs text-[--tx-disabled]">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
