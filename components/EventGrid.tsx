"use client";

import { useI18n } from "@/components/I18nProvider";
import { NormalizedEvent } from "@/lib/types";
import EventCard from "./EventCard";

export default function EventGrid({
  events,
  totalEvents,
  hasActiveFilters,
}: {
  events: NormalizedEvent[];
  totalEvents: number;
  hasActiveFilters: boolean;
}) {
  const { t } = useI18n();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface-raised/50 py-20 text-center">
        {totalEvents === 0 ? (
          <>
            <p className="font-display text-xl text-white">{t("emptyTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-zinc-400">{t("emptyBody")}</p>
          </>
        ) : (
          <>
            <p className="font-display text-xl text-white">{t("noMatchTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              {hasActiveFilters ? t("noMatchActive") : t("noMatchInactive")}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
