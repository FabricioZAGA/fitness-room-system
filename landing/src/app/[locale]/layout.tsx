import { SetLang } from "@/components/SetLang";

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
