import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Fitness Room — Sistema de Gestión para Gimnasios",
  description:
    "Plataforma integral para gimnasios y estudios de fitness en México. Membresías, check-in, clases, instructores, portal del alumno y más.",
  keywords: [
    "gimnasio",
    "fitness",
    "sistema de gestión",
    "membresías",
    "check-in",
    "México",
    "software gym",
  ],
  openGraph: {
    title: "Fitness Room — La plataforma que tu gimnasio necesita",
    description:
      "Membresías, check-in, clases y más. Diseñado para estudios de fitness en México.",
    type: "website",
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
