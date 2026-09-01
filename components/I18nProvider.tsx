"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { interpolate, messages, Messages } from "@/lib/i18n/messages";

type Translate = (key: keyof Messages, vars?: Record<string, string | number>) => string;

const I18nContext = createContext<{
  locale: Locale;
  t: Translate;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const value = useMemo(() => {
    const t: Translate = (key, vars) => interpolate(messages[locale][key], vars);
    return {
      locale,
      t,
      setLocale: (next: Locale) => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setLocaleState(next);
        router.refresh();
      },
    };
  }, [locale, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

export default I18nProvider;
