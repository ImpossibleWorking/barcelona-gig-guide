"use client";

import { formatLastUpdated } from "@/lib/format-date";
import { useI18n } from "@/components/I18nProvider";

export default function SiteFooter({ lastSyncedAt }: { lastSyncedAt?: string | null }) {
  const { t, locale } = useI18n();

  return (
    <footer className="mt-auto border-t border-white/8 bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        {lastSyncedAt ? (
          <p className="text-xs font-medium text-zinc-400">
            {t("listingsUpdated", { date: formatLastUpdated(lastSyncedAt, locale) })}
          </p>
        ) : null}
        <p className={`text-xs leading-relaxed text-zinc-500 ${lastSyncedAt ? "mt-3" : ""}`}>
          {t("footerDisclaimer")}
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          <a href="/privacy" className="text-zinc-400 transition hover:text-accent">
            {t("privacyLink")}
          </a>
        </p>
        <p className="mt-3 text-xs italic text-zinc-600">{t("footerTag")}</p>
      </div>
    </footer>
  );
}
