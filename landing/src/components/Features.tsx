import {
  Zap, CreditCard, CalendarDays, Users, LayoutDashboard,
  GraduationCap, QrCode, Smartphone, Snowflake, BarChart3,
  Mail, Moon, Globe, type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
  span?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "Check-in Instantáneo",
    description:
      "2 letras y el miembro aparece. Un clic registra la entrada. Valida membresía y estado en tiempo real.",
    tag: "Uso diario",
    span: "sm:col-span-2",
  },
  {
    icon: CreditCard,
    title: "Control de Membresías",
    description:
      "Mensual, trimestral, semestral, anual y packs de clases. Alertas de vencimiento y renovación con un clic.",
    tag: "Pagos en MXN",
  },
  {
    icon: CalendarDays,
    title: "Clases Grupales",
    description:
      "Calendario visual por semana. Capacidad máxima con lista de espera automática.",
    tag: "Con lista de espera",
  },
  {
    icon: Users,
    title: "Gestión de Alumnos",
    description:
      "Perfil completo con historial de membresías y clases. Búsqueda instantánea. Estados automáticos.",
    tag: "Perfil completo",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard en Tiempo Real",
    description:
      "Alumnos activos, clases del día, membresías por vencer. Una sola llamada a la API.",
    tag: "1 llamada API",
    span: "sm:col-span-2",
  },
  {
    icon: GraduationCap,
    title: "Instructores",
    description:
      "Especialidades, asignación a clases, estado activo/inactivo. Historial completo.",
    tag: "Gestión de equipo",
  },
  {
    icon: QrCode,
    title: "Check-in por QR",
    description:
      "Código QR único por alumno. Escaneo en kiosco — registro automático sin tocar nada.",
    tag: "Kiosco de entrada",
  },
  {
    icon: Smartphone,
    title: "Portal del Alumno",
    description:
      "Su propio portal móvil: clases, inscripciones, lista de espera y cancelaciones.",
    tag: "Self-service",
    span: "sm:col-span-2",
  },
  {
    icon: Snowflake,
    title: "Congelar Membresía",
    description:
      "Pausa de 7 a 180 días por lesión o viaje. La fecha de vencimiento se extiende automáticamente.",
    tag: "Hasta 180 días",
  },
  {
    icon: BarChart3,
    title: "Exportar Reportes",
    description:
      "Ingresos, rankings y alumnos inactivos en Excel o PDF con diseño corporativo.",
    tag: "Excel + PDF",
  },
  {
    icon: Mail,
    title: "Notificaciones Email",
    description:
      "Recordatorios automáticos de vencimiento. Alertas de inactividad. AWS SES integrado.",
    tag: "Automático",
  },
  {
    icon: Moon,
    title: "Modo Oscuro y Claro",
    description:
      "Diseño negro y dorado, adaptable a cualquier iluminación de recepción.",
    tag: "Dark mode",
  },
  {
    icon: Globe,
    title: "Español e Inglés",
    description:
      "Interfaz completa en ambos idiomas. Detección automática del navegador.",
    tag: "i18n",
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            Funcionalidades
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            Todo lo que tu gimnasio necesita
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[--tx-muted]">
            Diseñado para la operación diaria de estudios de fitness en México.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`card-hover group rounded-[20px] border border-[--bd-default] bg-[--bg-surface] p-6 ${f.span ?? ""}`}
            >
              {/* Icon */}
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-110"
                style={{
                  background: "var(--gold-bg)",
                  border: "1px solid var(--gold-bd)",
                }}
              >
                <f.icon size={20} className="text-[--gold]" />
              </div>

              <h3 className="mb-2 text-base font-semibold text-[--tx-primary]">
                {f.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-[--tx-muted]">
                {f.description}
              </p>

              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--gold-bg)",
                  color: "var(--gold)",
                  border: "1px solid var(--gold-bd)",
                }}
              >
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
