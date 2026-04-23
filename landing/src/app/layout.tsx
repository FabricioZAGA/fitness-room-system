import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://platform.fitnessroom.mx"),
  title: {
    default: "Fitness Room — Sistema de Gestión para Gimnasios",
    template: "%s | Fitness Room",
  },
  description:
    "Plataforma integral para gimnasios y estudios de fitness en México. Membresías, check-in QR, clases, instructores, portal del alumno y más.",
  keywords: [
    "sistema gestión gimnasio México",
    "software gimnasio",
    "gestión gimnasio",
    "membresías gimnasio",
    "check-in QR gimnasio",
    "fitness studio software",
    "control de acceso gym",
    "portal alumno gimnasio",
    "clases fitness",
    "instructores fitness",
    "software gym México",
    "administración gimnasio",
  ],
  openGraph: {
    title: "Fitness Room — La plataforma que tu gimnasio necesita",
    description:
      "Membresías, check-in QR, clases, instructores y portal del alumno. Diseñado para estudios de fitness en México.",
    type: "website",
    url: "https://platform.fitnessroom.mx",
    siteName: "Fitness Room System",
    locale: "es_MX",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fitness Room — Sistema de Gestión para Gimnasios",
    description:
      "Membresías, check-in QR, clases y portal del alumno. Software para gimnasios en México.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
