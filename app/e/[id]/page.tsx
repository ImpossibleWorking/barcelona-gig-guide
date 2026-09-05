import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventImage from "@/components/EventImage";
import EventShareButton from "@/components/EventShareButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import StructuredData from "@/components/StructuredData";
import { getOutboundPath } from "@/lib/affiliate";
import { formatEventDateTime, isEventToday } from "@/lib/datetime";
import { getEventById } from "@/lib/events";
import { formatEventPrice } from "@/lib/format-event-price";
import { getLocale, getMessages } from "@/lib/i18n/get-locale";
import { interpolate } from "@/lib/i18n/messages";
import { SITE_NAME, absoluteUrl, getEventPath } from "@/lib/seo";
import { buildEventPageStructuredData } from "@/lib/structured-data";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await getEventById(decodeURIComponent(params.id));
  if (!event) {
    return { title: "Event" };
  }

  const copy = getMessages(getLocale());
  const locale = getLocale();
  const date = formatEventDateTime(event.start_datetime, locale);
  const price = formatEventPrice(event, locale);
  const title = interpolate(copy.metaEventTitle, { title: event.title, venue: event.venue_name });
  const description = interpolate(copy.metaEventDescription, {
    title: event.title,
    venue: event.venue_name,
    date,
    price,
  });
  const canonical = getEventPath(event.id);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(canonical),
      ...(event.image_url ? { images: [{ url: event.image_url, alt: event.title }] } : {}),
    },
    twitter: {
      title: `${title} | ${SITE_NAME}`,
      description,
      ...(event.image_url ? { images: [event.image_url] } : {}),
    },
  };
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEventById(decodeURIComponent(params.id));
  if (!event) notFound();

  const locale = getLocale();
  const copy = getMessages(locale);
  const date = formatEventDateTime(event.start_datetime, locale);
  const price = formatEventPrice(event, locale, (key, vars) => interpolate(copy[key], vars));
  const tonight = isEventToday(event.start_datetime);

  return (
    <>
      <StructuredData data={buildEventPageStructuredData(event)} />
      <main className="flex min-h-screen flex-col bg-brand-gradient">
        <header className="border-b border-white/8 bg-surface px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-accent transition hover:text-accent-hover"
            >
              {copy.backToGigs}
            </Link>
            <LanguageSwitcher />
          </div>
        </header>

        <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-xl border border-white/8 bg-surface-raised">
            <div className="relative">
              <EventImage src={event.image_url} alt={event.title} genre={event.genre} />
              {tonight ? (
                <span className="absolute right-3 top-3 rounded bg-accent px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-black">
                  {copy.tonightBadge}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 p-6">
              <div>
                <h1 className="font-display text-3xl text-white sm:text-4xl">{event.title}</h1>
                <p className="mt-2 text-lg text-zinc-300">{event.venue_name}</p>
                {event.address ? <p className="mt-1 text-sm text-zinc-500">{event.address}</p> : null}
              </div>

              <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">{date}</p>
              <p className="text-base font-semibold text-white">{price}</p>

              {event.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                  {event.description}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={getOutboundPath(event.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-bold text-black transition hover:bg-accent-hover"
                >
                  {copy.getTickets}
                </a>
                <EventShareButton eventId={event.id} title={event.title} />
              </div>
            </div>
          </div>
        </article>

        <SiteFooter lastSyncedAt={event.last_synced_at} />
      </main>
    </>
  );
}
