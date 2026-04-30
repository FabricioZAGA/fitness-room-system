import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GYM_CONFIG } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const c = GYM_CONFIG;

export const metadata: Metadata = {
  metadataBase: new URL(`https://${c.seo.domain}`),
  title: {
    default: c.seo.title,
    template: `%s | ${c.name}`,
  },
  description: c.seo.description,
  keywords: [
    "gym", "gimnasio", c.location.city, c.location.state, "fitness",
    "hyrox", "strong nation", "entrenamiento funcional",
    "yoga", "mat", "zumba", "clases grupales", "membresías", c.name,
  ],
  authors: [{ name: c.name }],
  creator: c.name,
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: `https://${c.seo.domain}`,
    siteName: c.name,
    title: c.seo.title,
    description: c.seo.description,
    images: [{ url: c.seo.ogImage, width: 1200, height: 630, alt: c.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: c.seo.title,
    description: c.seo.description,
    images: [c.seo.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: `https://${c.seo.domain}` },
};

const socialUrls: readonly (string | null | undefined)[] = [
  c.contact.instagramUrl,
  c.contact.facebookUrl,
];
const sameAs: string[] = socialUrls.filter(
  (v): v is string => typeof v === "string" && v.length > 0,
);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HealthClub",
  name: c.name,
  description: c.description,
  url: `https://${c.seo.domain}`,
  telephone: c.contact.phone,
  email: c.contact.email,
  image: c.seo.ogImage,
  address: {
    "@type": "PostalAddress",
    streetAddress: c.location.address,
    addressLocality: c.location.city,
    addressRegion: c.location.state,
    postalCode: c.location.zip,
    addressCountry: "MX",
  },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "08:00", closes: "10:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "19:00", closes: "21:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "08:00", closes: "10:00" },
  ],
  sameAs,
  priceRange: "$$",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
