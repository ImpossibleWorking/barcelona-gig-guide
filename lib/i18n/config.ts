export const LOCALES = ["en", "es", "ca", "it", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "bcn_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  ca: "CA",
  it: "IT",
  fr: "FR",
  de: "DE",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ca: "Català",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
};

export const DATE_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  es: "es-ES",
  ca: "ca-ES",
  it: "it-IT",
  fr: "fr-FR",
  de: "de-DE",
};

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  es: "es",
  ca: "ca",
  it: "it",
  fr: "fr",
  de: "de",
};

export const OG_LOCALE: Record<Locale, string> = {
  en: "en_GB",
  es: "es_ES",
  ca: "ca_ES",
  it: "it_IT",
  fr: "fr_FR",
  de: "de_DE",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const tags = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
