"use client";

import Image from "next/image";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";

export default function SiteHeader({
  eventCount,
  isDemo = false,
}: {
  eventCount?: number;
  isDemo?: boolean;
}) {
  const { t } = useI18n();

  return (
    <header className="relative overflow-hidden border-b border-white/8 bg-brand-gradient">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,212,191,0.05)_0%,transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/30">
              <Image
                src="/logo.png"
                alt={t("brand")}
                width={40}
                height={40}
                priority
                className="rounded-sm"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {t("kicker")}
              </p>
              <h1 className="font-display text-4xl leading-none text-white sm:text-5xl">
                {t("brand")}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                {t("tagline")}
                {eventCount != null && eventCount > 0 ? (
                  <span className="text-zinc-500">
                    {" "}
                    · {t("upcomingCount", { count: eventCount })}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
        {isDemo ? (
          <p className="mt-5 max-w-2xl rounded-lg border border-accent/20 bg-accent-muted px-3 py-2 text-xs text-accent">
            {t("demoBanner")}
          </p>
        ) : null}
      </div>
    </header>
  );
}
