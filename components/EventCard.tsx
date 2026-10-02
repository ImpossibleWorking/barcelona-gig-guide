"use client";

import EventImage from "@/components/EventImage";
import EventShareButton from "@/components/EventShareButton";
import TicketLink from "@/components/TicketLink";
import { useI18n } from "@/components/I18nProvider";
import { isEventToday } from "@/lib/datetime";
import { formatEventPrice, hasDisplayPrice } from "@/lib/format-event-price";
import { formatListedEventDate } from "@/lib/format-listed-event";
import { Messages } from "@/lib/i18n/messages";
import { getEventPath } from "@/lib/seo";
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
  const eventPath = getEventPath(event.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-surface-raised transition duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5">
      <a
        href={eventPath}
        aria-label={t("viewEventAria", { title: event.title, venue: event.venue_name })}
        className="flex flex-1 flex-col"
      >
        <div className="relative">
          <EventImage src={event.image_url} alt={event.title} genre={event.genre} />
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
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white group-hover:text-accent-hover">
            {event.title}
          </h2>
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
      <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
        <TicketLink
          event={event}
          ariaLabel={t("viewTicketsAria", { title: event.title, venue: event.venue_name })}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition hover:opacity-90 ${
            hasDisplayPrice(event)
              ? "bg-accent text-black"
              : "border border-white/10 bg-zinc-800 text-zinc-200"
          }`}
        >
          {t("getTickets")} · {formatEventPrice(event, locale, t)}
        </TicketLink>
        <EventShareButton eventId={event.id} title={event.title} />
      </div>
    </article>
  );
}
