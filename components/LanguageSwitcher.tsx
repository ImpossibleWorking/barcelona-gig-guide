"use client";

import { Locale, LOCALES, LOCALE_LABELS, LOCALE_NAMES } from "@/lib/i18n/config";
import { useI18n } from "@/components/I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="shrink-0">
      <label className="sr-only" htmlFor="locale-select">
        {t("language")}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white [color-scheme:dark] focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 sm:hidden"
        aria-label={t("language")}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]} · {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
      <div
        className="hidden flex-wrap justify-end rounded-lg border border-white/10 p-0.5 sm:flex"
        role="group"
        aria-label={t("language")}
      >
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`rounded-md px-2 py-1 text-xs font-semibold tracking-wide transition ${
              locale === code
                ? "bg-accent-muted text-accent"
                : "text-zinc-400 hover:text-white"
            }`}
            aria-pressed={locale === code}
            title={LOCALE_NAMES[code]}
          >
            {LOCALE_LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
