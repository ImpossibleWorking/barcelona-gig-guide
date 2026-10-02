import { toTimeZoneDateString } from "@/lib/datetime";
import { NormalizedEvent } from "@/lib/types";

export function normalizeForDedup(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/** Ticketmaster (and similar) list VIP/hotel/parking as a second "event" for the same night. */
const TICKET_VARIANT_SUFFIX =
  /\s*[\|\u2013\u2014\-]\s*(vip|platinum|gold|hospitality|parking|hotel|meet\s*[&+]?\s*greet|packages?|experiences?|presale)\b.*$/i;

export function stripTicketVariantSuffix(title: string): string {
  return title.replace(/\u00a0/g, " ").replace(TICKET_VARIANT_SUFFIX, "").trim();
}

export function canonicalEventTitle(title: string): string {
  return normalizeForDedup(stripTicketVariantSuffix(title));
}

export function isTicketVariantListing(title: string): boolean {
  return TICKET_VARIANT_SUFFIX.test(title.replace(/\u00a0/g, " "));
}

export function eventDedupKey(event: NormalizedEvent): string {
  return `${canonicalEventTitle(event.title)}|${normalizeForDedup(event.venue_name)}|${toTimeZoneDateString(event.start_datetime)}`;
}

function richness(event: NormalizedEvent): number {
  return [event.description, event.image_url, event.address, event.latitude, event.price_min].filter(
    (field) => field !== null && field !== undefined
  ).length;
}

export function pickPreferredDuplicate(a: NormalizedEvent, b: NormalizedEvent): NormalizedEvent {
  const aVariant = isTicketVariantListing(a.title);
  const bVariant = isTicketVariantListing(b.title);
  if (aVariant !== bVariant) return aVariant ? b : a;
  return richness(b) > richness(a) ? b : a;
}

function titleDateKey(event: NormalizedEvent): string {
  return `${canonicalEventTitle(event.title)}|${toTimeZoneDateString(event.start_datetime)}`;
}

function isTicketedSource(event: NormalizedEvent): boolean {
  return event.source === "eventbrite" || event.source === "ticketmaster";
}

/** Collapse the same show listed twice (cross-source, or Ticketmaster general vs VIP). */
export function dedupeEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  const byKey = new Map<string, NormalizedEvent>();

  for (const event of events) {
    const key = eventDedupKey(event);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferredDuplicate(existing, event) : event);
  }

  const unique = Array.from(byKey.values());
  const ticketedTitleDates = new Set(
    unique.filter(isTicketedSource).map((event) => titleDateKey(event))
  );

  // City agenda rows often only have a neighbourhood. Drop them when a ticketed
  // listing already covers the same title on the same night.
  return unique.filter(
    (event) => event.source !== "opendata" || !ticketedTitleDates.has(titleDateKey(event))
  );
}
