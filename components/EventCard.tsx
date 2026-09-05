"use client";

import EventShareButton from "@/components/EventShareButton";
import { useI18n } from "@/components/I18nProvider";
import { getOutboundPath } from "@/lib/affiliate";
import { isEventToday } from "@/lib/datetime";
import { formatEventPrice, hasDisplayPrice } from "@/lib/format-event-price";
import { formatListedEventDate } from "@/lib/format-listed-event";
import { Messages } from "@/lib/i18n/messages";
import { ListedEvent } from "@/lib/types";

const GENRE_KEYS: Record<string, keyof Messages> = {
  "live-music": "liveMusic",
  clubbing: "clubbing",
  festival: "festival",
  comedy: "comedy",
  other: "other",
};

const SOURCE_KEYS: Record<string, keyof Messages> = {
  eventbrite: "viaEventbrite",
  ticketmaster: "viaTicketmaster",
  opendata: "viaOpenData",
};

export default function EventCard({ event }: { event: ListedEvent }) {
  const { t, locale } = useI18n();
  const isTonight = isEventToday(event.start_datetime);
  const genreKey = event.genre ? GENRE_KEYS[event.genre] : undefined;
  const sourceKey = SOURCE_KEYS[event.source];

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-surface-raised transition duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5">
      <a
        href={getOutboundPath(event.id)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("viewTicketsAria", { title: event.title, venue: event.venue_name })}
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized source images
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-sm text-zinc-500">
              {t("noImage")}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
          {isTonight && (
            <span className="absolute right-3 top-3 rounded bg-accent px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-black">
              {t("tonightBadge")}
            </span>
          )}
          {sourceKey ? (
            <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {t(sourceKey)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white group-hover:text-accent-hover">
              {event.title}
            </h2>
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                hasDisplayPrice(event)
                  ? "bg-accent text-black"
                  : "border border-white/10 bg-zinc-800 text-zinc-300"
              }`}
            >
              {formatEventPrice(event, locale, t)}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{event.venue_name}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {formatListedEventDate(event, locale, t)}
          </p>
          {event.genre && (
            <span className="mt-auto w-fit rounded-md border border-accent/20 bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent">
              {genreKey ? t(genreKey) : event.genre}
            </span>
          )}
        </div>
      </a>
      <div className="flex justify-end border-t border-white/8 px-4 py-2">
        <EventShareButton eventId={event.id} title={event.title} />
      </div>
    </article>
  );
}
