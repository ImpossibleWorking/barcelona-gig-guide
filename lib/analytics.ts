import { NormalizedEvent } from "@/lib/types";

type TicketEvent = Pick<NormalizedEvent, "id" | "title" | "source" | "venue_name">;

function gtag(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
}

/** Fires before /go hops so ticket clicks still show up in GA4. */
export function trackTicketClick(event: TicketEvent) {
  const send = gtag();
  if (!send) return;

  send("event", "ticket_click", {
    event_id: event.id,
    event_title: event.title,
    event_source: event.source,
    venue_name: event.venue_name,
  });
}
