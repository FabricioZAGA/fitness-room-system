/** Changelog data for the "What's New" dialog.
 *
 * Add new entries at the TOP of the array.
 * The component checks localStorage for the last-seen version
 * and shows the dialog automatically when there are unseen entries.
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: { icon: string; text: string }[];
}

export const APP_VERSION = "1.4.0";

export const changelog: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-04-23",
    title: "Rediseño de miembros y membresías",
    items: [
      { icon: "🔄", text: "Nuevo modelo de estados — miembros: activo, inactivo o suspendido (eliminados 'nuevo' y 'fundador')" },
      { icon: "🏅", text: "Membresía Fundador — nuevo tipo 'Fundador (Mensual)' para los 30 miembros exclusivos" },
      { icon: "⚡", text: "Cascada automática — desactivar cancela membresía, suspender la congela, reactivar la descongela" },
      { icon: "🛡️", text: "Suspensión temporal — nuevo flujo para bloquear miembros por conducta/deuda sin perder membresía" },
      { icon: "✅", text: "Check-in reforzado — valida miembro activo + membresía activa (ya no permite fundador como status)" },
      { icon: "🎨", text: "UI mejorada — lista de miembros con componentes reutilizables y filtros simplificados" },
      { icon: "📋", text: "Acciones contextuales — botones del detalle de miembro se adaptan según su estado" },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-04-23",
    title: "Optimización, SEO y seguridad",
    items: [
      { icon: "⚡", text: "Lambda ARM64 (Graviton2) + 1024 MB — respuestas más rápidas y menor costo AWS" },
      { icon: "🗜️", text: "GZip en API — respuestas comprimidas para cargas más rápidas" },
      { icon: "💀", text: "Skeleton loaders en Dashboard — shimmer animation mientras cargan datos" },
      { icon: "🔒", text: "Seguridad reforzada — IAM scoped, CORS restringido, JWKS cache con TTL" },
      { icon: "🔍", text: "SEO mejorado — sitemap, robots.txt, JSON-LD, Open Graph y hreflang" },
      { icon: "🛡️", text: "Error boundary mejorado — botón 'Ir al inicio' y detalles solo en dev" },
      { icon: "📱", text: "Portal mobile — skeleton loading shimmer para carga más fluida" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-23",
    title: "Teléfono internacional, dirección estructurada y gestión de usuarios",
    items: [
      { icon: "🌎", text: "Teléfono internacional — selector de país con validación E.164 (MX, US, CO, AR, ES, CL, PE, BR, EC, GT)" },
      { icon: "🏠", text: "Dirección estructurada — calle, # ext/int, colonia, ciudad, estado (32 estados MX) y C.P." },
      { icon: "🛡️", text: "Gestión de usuarios — crear, deshabilitar y eliminar usuarios Cognito desde el panel admin" },
      { icon: "🏷️", text: "Especialidades configurables — 15 predefinidas + opción de agregar personalizadas para instructores" },
      { icon: "🔑", text: "Cuenta automática — al crear instructor se genera su cuenta de acceso al portal" },
      { icon: "👁️", text: "Portal por rol — alumnos ven QR y membresía, instructores ven clases asignadas y horario" },
      { icon: "📋", text: "Documentación actualizada — architecture overview, database design y landing page" },
    ],
  },
  {
    version: "1.1.0",
    date: "2025-04-22",
    title: "Fotos de perfil, modalidad de clases y rol recepcionista",
    items: [
      { icon: "📸", text: "Fotos de perfil para alumnos — captura directa con cámara al registrar o editar" },
      { icon: "🏋️", text: "Nuevos campos de alumno: fecha de nacimiento, dirección, ciudad y contacto de emergencia" },
      { icon: "🖼️", text: "Soporte de imagen para productos del inventario" },
      { icon: "🎥", text: "Modalidad de clase: presencial o virtual con link de sesión" },
      { icon: "👤", text: "Nuevo rol de recepcionista con acceso limitado al panel de administración" },
      { icon: "🏢", text: "Renombrado 'Gimnasio' a 'Studio' en toda la interfaz" },
      { icon: "📧", text: "Correos de contacto configurados: contacto@ y recepcion@fitnessroom.mx" },
    ],
  },
];

const SEEN_KEY = "fitness-room-changelog-seen";

export function hasUnseenChangelog(): boolean {
  const seen = localStorage.getItem(SEEN_KEY);
  return seen !== APP_VERSION;
}

export function markChangelogSeen(): void {
  localStorage.setItem(SEEN_KEY, APP_VERSION);
}
