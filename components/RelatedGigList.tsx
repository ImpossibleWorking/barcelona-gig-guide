import Link from "next/link";
import { formatEventDateTime } from "@/lib/datetime";
import { Locale } from "@/lib/i18n/config";
import { getEventPath } from "@/lib/seo";
import { ListedEvent } from "@/lib/types";

export default function RelatedGigList({
  title,
  events,
  locale,
}: {
  title: string;
  events: ListedEvent[];
  locale: Locale;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">{title}</h2>
      <ul className="mt-3 divide-y divide-white/8 overflow-hidden rounded-xl border border-white/8 bg-surface-raised">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              href={getEventPath(event.id)}
              className="flex flex-col gap-1 px-4 py-3 transition hover:bg-white/5 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <span className="font-medium text-white">{event.title}</span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {event.venue_name} · {formatEventDateTime(event.start_datetime, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
