"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale } from "@/lib/i18n";

export default function FAQRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${defaultLocale}/faq/`);
  }, [router]);
  return null;
}
