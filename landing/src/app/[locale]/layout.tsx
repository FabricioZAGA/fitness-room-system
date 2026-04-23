import type { Metadata } from "next";
import { isValidLocale } from "@/lib/i18n";
import { SetLang } from "@/components/SetLang";

const BASE_URL = "https://platform.fitnessroom.mx";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isValidLocale(raw) ? raw : "es";
  return {
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        es: `${BASE_URL}/es`,
        en: `${BASE_URL}/en`,
        de: `${BASE_URL}/de`,
        ja: `${BASE_URL}/ja`,
        zh: `${BASE_URL}/zh`,
        "x-default": `${BASE_URL}/es`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <SetLang locale={locale} />
      {children}
    </>
  );
}
