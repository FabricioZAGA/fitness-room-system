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

export const APP_VERSION = "1.1.0";

export const changelog: ChangelogEntry[] = [
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
