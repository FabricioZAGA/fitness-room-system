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

export const APP_VERSION = "1.7.2";

export const changelog: ChangelogEntry[] = [
  {
    version: "1.7.2",
    date: "2026-05-01",
    title: "Carta responsiva afinada y correo de acceso según rol",
    items: [
      { icon: "📝", text: "Bloque legal de la carta responsiva con textos más precisos — 'Correo registrado' en lugar de 'verificado', etiquetas 'Firmante (alumno)' y 'Emisor (contraparte)'" },
      { icon: "📧", text: "Footer del PDF ahora muestra el correo del gym (contacto@fitnessroom.mx), no el del alumno" },
      { icon: "🔐", text: "Invitación a admins/staff ya no dice 'Portal de Alumnos' — usa el título correcto según el rol" },
    ],
  },
  {
    version: "1.7.1",
    date: "2026-05-01",
    title: "Inventario arreglado — crear, vender y notificar stock bajo",
    items: [
      { icon: "🐛", text: "Arreglado el 500 que impedía registrar productos (colisión con 'name' reservado de LogRecord)" },
      { icon: "💾", text: "Update de producto ya no corrompe el precio (se guarda como número, no como texto)" },
      { icon: "📧", text: "Botón 'Enviar alertas' en el banner de stock bajo — dispara los correos a los admins al instante" },
      { icon: "✅", text: "Modal de nuevo producto muestra los errores del formulario y acepta Enter para enviar" },
      { icon: "🧮", text: "Validación más estricta de precio (>0), stock (≥0) y nombre (≥2 chars) antes de mandar al backend" },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-04-29",
    title: "Nuevo catálogo de planes y clases de Fitness Room León",
    items: [
      { icon: "💳", text: "Planes actualizados: Socio Fundador, Room Daily, Room Elite, Room Flex y Room Pass con precios sugeridos" },
      { icon: "🏋️", text: "Clases actualizadas: Hyrox, Strong Nation, Entrenamiento Funcional, Yoga, Mat y Zumba" },
      { icon: "💰", text: "Caja ya no permite cobrar membresías directo — se registran automáticamente al asignar la membresía desde el alumno" },
      { icon: "🛟", text: "Dashboard más resistente: si una fuente de datos falla, el resto sigue cargando y muestras un botón Reintentar" },
      { icon: "🔔", text: "Mensajes de error visibles al crear/actualizar/reabastecer productos" },
      { icon: "🌐", text: "Landing pública renovada con la info real del studio: León, horarios, planes reales y contacto" },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-04-28",
    title: "Sesión extendible y modo \"mantener sesión\"",
    items: [
      { icon: "⏳", text: "Aviso automático 2 minutos antes de que expire tu sesión con countdown y opción de continuar" },
      { icon: "🔐", text: "Checkbox \"Mantener sesión iniciada en este navegador\" en el login de admin y portal" },
      { icon: "🤫", text: "Con la preferencia activa, renovamos tu sesión automáticamente sin interrumpirte" },
      { icon: "🧹", text: "Opción en Configuración → Seguridad para olvidar el navegador y volver a pedir confirmación" },
      { icon: "🔔", text: "Toast claro cuando la sesión expira sin acción, para evitar que te quedes \"colgado\" en pantalla" },
    ],
  },
  {
    version: "1.5.6",
    date: "2026-04-24",
    title: "Entrega de correos, reinvitación y rendimiento",
    items: [
      { icon: "📧", text: "Detección pre-envío de direcciones en lista de supresión de SES: ya no se pierden correos silenciosamente" },
      { icon: "🔁", text: "Botón \"Reenviar invitación\" en gestión de usuarios — regenera contraseña temporal y reenvía el correo" },
      { icon: "🔔", text: "Toast con estado de entrega al crear usuario (enviado, suprimido o fallido)" },
      { icon: "🛡️", text: "Rate limiting en API Gateway (20 rps sostenido, 50 burst) — protege contra abuso" },
      { icon: "⚡", text: "Bundle principal del admin reducido 69% (1.6MB → 521kB) con lazy-loading por ruta y exports diferidos" },
      { icon: "🔧", text: "postcss actualizado a 8.5.10 (CVE XSS parcheado) en admin y portal" },
    ],
  },
  {
    version: "1.5.5",
    date: "2026-04-24",
    title: "Validación de inputs y calidad de formularios",
    items: [
      { icon: "🎨", text: "Colores de error/éxito en inputs ahora usan variables CSS del sistema de diseño" },
      { icon: "📝", text: "Crear usuario — nombre separado en Nombre y Apellido (consistente con alumnos e instructores)" },
      { icon: "🔑", text: "Portal — inputs con mejor contraste de borde y texto de requisitos de contraseña más legible" },
      { icon: "✅", text: "Atributos required en inputs del login del portal" },
    ],
  },
  {
    version: "1.5.4",
    date: "2026-04-24",
    title: "RBAC corregido y filtros de alumnos",
    items: [
      { icon: "🔒", text: "RBAC — recepcionista ahora se puede crear desde el panel (estaba bloqueado por error)" },
      { icon: "🚫", text: "Gestión de usuarios — solo se crean admin y recepcionista manualmente; alumnos e instructores se crean automáticamente" },
      { icon: "🔑", text: "Primer login — ya no pide nombre al cambiar contraseña (se tomó del registro original)" },
      { icon: "🐛", text: "Filtros de alumnos por estado ya funcionan correctamente (activo, inactivo, suspendido)" },
    ],
  },
  {
    version: "1.5.3",
    date: "2026-04-23",
    title: "i18n completo, modales y nuevas pantallas",
    items: [
      { icon: "🌍", text: "i18n completo — todas las pantallas y modales traducidos ES/EN" },
      { icon: "📦", text: "Inventario — gestión de productos, ventas y restock" },
      { icon: "💰", text: "Caja y Reportes — traducciones de pagos, cortes, ingresos y rankings" },
      { icon: "👤", text: "Modales de alumno e instructor — crear y editar con cámara, dirección y contacto de emergencia" },
      { icon: "🔧", text: "Gestión de usuarios — deshabilitar, eliminar y badges con i18n" },
    ],
  },
  {
    version: "1.5.2",
    date: "2026-04-23",
    title: "Internacionalización completa y mejoras",
    items: [
      { icon: "🌍", text: "i18n completo — todas las pantallas traducidas ES/EN con react-i18next" },
      { icon: "🔒", text: "Validación de unicidad — no se pueden duplicar emails/teléfonos entre alumnos e instructores" },
      { icon: "🎨", text: "Sidebar rediseñado con traducciones dinámicas y secciones organizadas" },
      { icon: "✅", text: "Badges de estado visual para usuarios Cognito (confirmado, pendiente, etc.)" },
      { icon: "📋", text: "Configuración AI — archivos de reglas para Windsurf, Claude y cualquier asistente AI" },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-04-23",
    title: "Unicidad de datos y configuración",
    items: [
      { icon: "🔒", text: "Validación de unicidad — no se pueden duplicar emails ni teléfonos entre alumnos, instructores y usuarios" },
      { icon: "🔀", text: "Verificación cruzada — al crear o editar, se valida contra todas las entidades del sistema" },
      { icon: "⚠️", text: "Mensajes claros — el admin ve exactamente qué entidad ya tiene el dato duplicado" },
      { icon: "⚙️", text: "Pantalla de configuración — tema, idioma, info del studio, alertas y seguridad" },
    ],
  },
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
