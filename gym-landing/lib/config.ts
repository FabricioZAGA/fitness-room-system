/**
 * Gym Landing Page Configuration
 *
 * Edit this file to customize the landing page for any gym.
 * All branding, contact info, schedule, and content is configurable here.
 */

export const GYM_CONFIG = {
  // ── BRANDING ──
  name: "Fitness Room",
  tagline: "Transforma tu cuerpo, transforma tu vida",
  description:
    "El estudio de fitness más completo de la ciudad. Clases grupales, entrenamiento personalizado y la mejor comunidad fitness de México.",
  logoText: "FR",
  // Set logoUrl to use an image instead of text: "/logo.png"
  logoUrl: null as string | null,

  // ── COLORS ──
  colors: {
    primary: "#d4af37",
    primaryHover: "#e5c158",
    primaryLight: "#f0d878",
    background: "#050505",
    surface: "#0c0c0c",
    elevated: "#141414",
    text: "#f5f5f5",
    textMuted: "#8a8a8a",
    border: "rgba(255, 255, 255, 0.06)",
  },

  // ── CONTACT ──
  contact: {
    phone: "+52 33 1234 5678",
    whatsapp: "5213312345678",
    email: "info@fitnessroom.mx",
    instagram: "fitnessroommx",
    facebook: "fitnessroommx",
    tiktok: "fitnessroommx",
  },

  // ── LOCATION ──
  location: {
    address: "Av. Chapultepec Sur 123, Col. Americana",
    city: "Guadalajara",
    state: "Jalisco",
    zip: "44160",
    country: "México",
    googleMapsUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3733.!2d-103.36!3d20.67!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjDCsDQwJzEyLjAiTiAxMDPCsDIxJzM2LjAiVw!5e0!3m2!1ses!2smx!4v1",
    lat: 20.6700,
    lng: -103.3600,
  },

  // ── SCHEDULE ──
  schedule: {
    weekdays: "6:00 AM — 10:00 PM",
    saturday: "7:00 AM — 2:00 PM",
    sunday: "8:00 AM — 1:00 PM",
  },

  // ── CLASSES ──
  classes: [
    { name: "Zumba", emoji: "💃", time: "7:00 AM", days: "Lun · Mié · Vie" },
    { name: "Yoga", emoji: "🧘", time: "8:00 AM", days: "Mar · Jue · Sáb" },
    { name: "Pilates", emoji: "🤸", time: "9:00 AM", days: "Lun · Mié · Vie" },
    { name: "Spinning", emoji: "🚴", time: "6:30 PM", days: "Lun a Vie" },
    { name: "CrossFit", emoji: "🏋️", time: "7:00 PM", days: "Mar · Jue" },
    { name: "Box", emoji: "🥊", time: "8:00 PM", days: "Lun · Mié · Vie" },
  ],

  // ── MEMBERSHIP PLANS ──
  plans: [
    {
      name: "Día suelto",
      price: "$120",
      period: "",
      highlight: false,
      features: ["Acceso completo por 1 día", "Todas las clases grupales", "Vestidores y regaderas"],
    },
    {
      name: "Mensual",
      price: "$799",
      period: "/mes",
      features: ["Acceso ilimitado", "Todas las clases grupales", "App del alumno", "Casillero incluido"],
      highlight: true,
    },
    {
      name: "Trimestral",
      price: "$1,999",
      period: "/3 meses",
      highlight: false,
      features: ["Todo en Mensual", "Ahorra $398", "Clase de prueba gratis para amigo", "Congelamiento incluido"],
    },
  ],

  // ── IMAGES (Unsplash URLs — replace with your own) ──
  images: {
    hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80",
    about: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
    classes: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80",
    trainers: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
    cta: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1920&q=80",
  },

  // ── TRAINERS ──
  trainers: [
    { name: "Coach Karina", specialty: "Zumba & Cardio", image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80" },
    { name: "Coach Daniel", specialty: "CrossFit & Funcional", image: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80" },
    { name: "Coach Sofía", specialty: "Yoga & Pilates", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80" },
  ],

  // ── SEO ──
  seo: {
    domain: "fitnessroom.mx",
    title: "Fitness Room — Gym en Guadalajara | Clases, Membresías y Más",
    description:
      "El mejor gym de Guadalajara. Clases de Zumba, Yoga, CrossFit, Spinning y más. Membresías desde $799/mes. Visítanos en Av. Chapultepec.",
    ogImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
  },

  // ── PORTAL LINK ──
  portalUrl: "https://portal.fitnessroom.mx",
} as const;

export type GymConfig = typeof GYM_CONFIG;
