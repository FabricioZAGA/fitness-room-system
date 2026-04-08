const FEATURES = [
  {
    icon: "⚡",
    title: "Check-in Instantáneo",
    description:
      "El recepcionista escribe 2 letras y el sistema muestra al miembro de inmediato. Un clic registra la entrada. Valida membresía activa y estado del alumno en tiempo real.",
    tag: "Uso diario",
  },
  {
    icon: "💳",
    title: "Control de Membresías",
    description:
      "Mensual, trimestral, semestral, anual y packs de 5, 10 o 20 clases. Alertas automáticas cuando vencen en 7 o 30 días. Renovación con un clic desde el panel.",
    tag: "Pagos en MXN",
  },
  {
    icon: "📅",
    title: "Clases Grupales",
    description:
      "Zumba, Pilates, Yoga, Spinning, Cross Training y más. Calendario visual por semana. Control de capacidad con lista de espera automática.",
    tag: "Con lista de espera",
  },
  {
    icon: "👥",
    title: "Gestión de Alumnos",
    description:
      "Registro completo con nombre, correo y teléfono. Historial de membresías y clases. Estados: Nuevo, Activo, Fundador e Inactivo. Búsqueda instantánea.",
    tag: "Perfil completo",
  },
  {
    icon: "🎯",
    title: "Dashboard en Tiempo Real",
    description:
      "Vista general con miembros activos, clases del día, membresías por vencer e instructores. Una sola llamada a la API — sin lentitud. Actualización cada 5 minutos.",
    tag: "1 llamada API",
  },
  {
    icon: "👨‍🏫",
    title: "Instructores",
    description:
      "Registro de instructores con especialidades. Asignación a clases. Control de estado activo/inactivo. Historial de clases impartidas.",
    tag: "Gestión de equipo",
  },
  {
    icon: "🌙",
    title: "Modo Oscuro y Claro",
    description:
      "El sistema recuerda tu preferencia. Diseño negro y dorado adaptado para uso en recepción con cualquier iluminación. Funciona en pantallas brillantes y oscuras.",
    tag: "Dark mode",
  },
  {
    icon: "🌎",
    title: "Español e Inglés",
    description:
      "Interfaz completa en español (default) con opción de cambiar a inglés. El sistema detecta el idioma del navegador automáticamente.",
    tag: "i18n",
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[--gold]">
            Funcionalidades
          </p>
          <h2 className="text-3xl font-bold text-[--tx-primary] sm:text-4xl">
            Todo lo que necesita tu gimnasio
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[--tx-muted]">
            Construido para la operación diaria de un estudio de fitness en México.
            Cada función fue diseñada para hacer la vida del recepcionista más fácil.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6 transition-all hover:border-[--gold-bd]"
            >
              <div className="mb-4 text-3xl">{feature.icon}</div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[--tx-primary]">
                  {feature.title}
                </h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-[--tx-muted]">
                {feature.description}
              </p>
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--gold-bg)",
                  color: "var(--gold)",
                  border: "1px solid var(--gold-bd)",
                }}
              >
                {feature.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
