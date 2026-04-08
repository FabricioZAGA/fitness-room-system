import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitness Room System — Gestión de Gimnasio",
  description:
    "Sistema integral de gestión para gimnasios y estudios de fitness en México. Control de membresías, check-in, clases, instructores y más.",
  keywords: [
    "gimnasio",
    "fitness",
    "sistema de gestión",
    "membresías",
    "check-in",
    "México",
  ],
  openGraph: {
    title: "Fitness Room System",
    description: "Sistema de gestión para tu gimnasio. Simple, rápido y hecho para México.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
