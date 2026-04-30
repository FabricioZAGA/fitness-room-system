/**
 * Gym Landing Page Configuration
 *
 * Edit this file to customize the landing page for any gym.
 * All branding, contact info, schedule, and content is configurable here.
 */

export const GYM_CONFIG = {
  // ── BRANDING ──
  name: "Fitness Room",
  tagline: "Entrena hoy, tu futuro te lo agradecerá",
  description:
    "Fitness Room está diseñado para personas que buscan algo más que hacer ejercicio: un entrenamiento guiado, efectivo y enfocado en resultados reales desde los primeros 15 días, con una visión clara: lo que haces hoy, construye tu futuro físico.",
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
    phone: "477 416 5998",
    whatsapp: "524774165998",
    email: "contacto@fitnessroom.mx",
    instagram: "fitnessroommx",
    instagramUrl: "https://www.instagram.com/fitnessroommx",
    facebookUrl: "https://www.facebook.com/share/1AG47nUxFF/",
    tiktok: null as string | null,
  },

  // ── LOCATION ──
  location: {
    address: "Av. Colinas de Gran Jardín 501, Planta Alta Local 17",
    neighborhood: "Lomas de Gran Jardín (Plaza Gran Jardín)",
    city: "León",
    state: "Guanajuato",
    zip: "37134",
    country: "México",
    googleMapsShortUrl: "https://maps.app.goo.gl/qBczeiE37zRkepvi6",
    googleMapsEmbedUrl:
      "https://www.google.com/maps?q=Av.+Colinas+de+Gran+Jardin+501,+Lomas+de+Gran+Jardin,+Leon,+Gto&output=embed",
  },

  // ── SCHEDULE ──
  schedule: {
    weekdays: "8–10 AM · 7–9 PM",
    saturday: "8–10 AM",
    sunday: "Cerrado",
  },

  // ── CLASSES ──
  // Owner prefers NO schedule on landing — visitors ask for info at studio.
  classes: [
    { name: "Hyrox", emoji: "🏃" },
    { name: "Strong Nation", emoji: "💪" },
    { name: "Entrenamiento Funcional", emoji: "🏋️" },
    { name: "Yoga", emoji: "🧘" },
    { name: "Mat", emoji: "🤸" },
    { name: "Zumba", emoji: "💃" },
  ],

  // ── MEMBERSHIP PLANS ──
  plans: [
    {
      name: "Socio Fundador",
      price: "$950",
      period: "/mes",
      tagline: "Pre-venta · AGOTADO",
      highlight: false,
      soldOut: true,
      features: [
        "Acceso a 1 sesión de entrenamiento diaria, de lunes a sábado",
        "Cualquier clase (1 sesión por día)",
        "Pre-venta y acceso prioritario a eventos especiales",
      ],
    },
    {
      name: "Room Daily",
      price: "$1,300",
      period: "/mes",
      tagline: "Ideal para crear hábito",
      highlight: false,
      soldOut: false,
      features: [
        "Acceso a 1 sesión diaria, de lunes a sábado",
        "Cualquier sesión — 1 por día",
      ],
    },
    {
      name: "Room Elite",
      price: "$1,600",
      period: "/mes",
      tagline: "Aquí empieza el cambio real",
      highlight: true,
      soldOut: false,
      features: [
        "Acceso ilimitado de lunes a sábado",
        "Combina todas las disciplinas",
      ],
    },
    {
      name: "Room Flex",
      price: "$1,150",
      period: "/mes",
      tagline: "Avanza sin excusas de tiempo",
      highlight: false,
      soldOut: false,
      features: [
        "12 sesiones al mes",
        "Tú eliges cuándo venir (sujeto a disponibilidad)",
      ],
    },
    {
      name: "Room Pass",
      price: "$150",
      period: "/sesión",
      tagline: "Vienes a probar o a quedarte",
      highlight: false,
      soldOut: false,
      features: [
        "1 sesión en horario disponible",
        "Vigencia el mismo día",
      ],
    },
  ],

  // ── IMAGES (Unsplash placeholders — reemplazar por fotos reales del studio) ──
  images: {
    hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80",
    about: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
    classes: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80",
    cta: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1920&q=80",
  },

  // ── SOCIAL PROOF ──
  // Google rating: actualiza manualmente desde la reseña real del negocio
  // en https://maps.app.goo.gl/qBczeiE37zRkepvi6
  socialProof: {
    members: "500+",
    googleRating: "4.9",
    disciplines: "10+",
    yearsOperating: "Desde 2002",
  },

  // ── SEO ──
  seo: {
    domain: "fitnessroom.mx",
    title: "Fitness Room — Gym en León, Gto | Hyrox, Funcional, Yoga y más",
    description:
      "Fitness Room en León, Gto. Entrenamiento guiado con resultados reales desde los primeros 15 días. Hyrox, Strong Nation, Funcional, Yoga, Mat y Zumba. Planes desde $150.",
    ogImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
  },

  // ── PORTAL LINK ──
  portalUrl: "https://portal.fitnessroom.mx",
} as const;

export type GymConfig = typeof GYM_CONFIG;
