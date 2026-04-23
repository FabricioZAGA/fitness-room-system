import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://platform.fitnessroom.mx";
const LOCALES = ["es", "en", "de", "ja", "zh"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
  ];

  return LOCALES.flatMap((locale) =>
    pages.map((page) => ({
      url: `${BASE_URL}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${BASE_URL}/${l}${page.path}`])
        ),
      },
    }))
  );
}
