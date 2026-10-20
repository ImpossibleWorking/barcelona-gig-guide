import { hasAffiliateCheckout } from "@/lib/affiliate";
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

/**
 * Collapse room aliases so Ticketmaster "Apolo" and the venue calendar
 * "Sala Apolo" (or Nitsa / La 2) count as the same place for a given night.
 */
export function canonicalVenueName(name: string): string {
  const normalized = normalizeForDedup(name);

  if (/\b(nitsa|apolo)\b/.test(normalized) || /\bla 2\b/.test(normalized)) return "sala apolo";
  if (/\bjamboree\b/.test(normalized)) return "jamboree";
  if (/\bupload\b/.test(normalized)) return "sala upload";
  if (/\bmarula\b/.test(normalized)) return "marula cafe";
  if (/\bharlem\b/.test(normalized)) return "harlem jazz club";
  if (/\bparal/.test(normalized) && /\b62\b/.test(normalized)) return "parallel 62";
  if (/\brazzmatazz\b/.test(normalized)) return "razzmatazz";
  if (/\bbikini\b/.test(normalized)) return "sala bikini";
  if (/\bbarts\b/.test(normalized)) return "barts";
  if (/\bsidecar\b/.test(normalized)) return "sidecar";
  if (/\bpalau sant jordi\b/.test(normalized)) return "palau sant jordi";
  if (/\bpalau de la mus/.test(normalized)) return "palau de la musica";

  return normalized.replace(/^(sala|club|teatro|teatre|the)\s+/, "");
}

export function isTicketVariantListing(title: string): boolean {
  return TICKET_VARIANT_SUFFIX.test(title.replace(/\u00a0/g, " "));
}

export function eventDedupKey(event: NormalizedEvent): string {
  return `${canonicalEventTitle(event.title)}|${canonicalVenueName(event.venue_name)}|${toTimeZoneDateString(event.start_datetime)}`;
}

function richness(event: NormalizedEvent): number {
  return [event.description, event.image_url, event.address, event.latitude, event.price_min].filter(
    (field) => field !== null && field !== undefined
  ).length;
}

function firstFilled<T>(primary: T, fallback: T): T {
  if (primary === null || primary === undefined || primary === "") return fallback;
  return primary;
}

/** Keep the winner's identity and checkout URL; fill gaps from the duplicate. */
export function mergeDuplicateFields(winner: NormalizedEvent, loser: NormalizedEvent): NormalizedEvent {
  return {
    ...winner,
    description: firstFilled(winner.description, loser.description),
    image_url: firstFilled(winner.image_url, loser.image_url),
    address: firstFilled(winner.address, loser.address),
    latitude: winner.latitude ?? loser.latitude,
    longitude: winner.longitude ?? loser.longitude,
    price_min: winner.price_min ?? loser.price_min,
    price_max: winner.price_max ?? loser.price_max,
    end_datetime: firstFilled(winner.end_datetime, loser.end_datetime),
    genre: winner.genre ?? loser.genre,
  };
}

export function pickPreferredDuplicate(a: NormalizedEvent, b: NormalizedEvent): NormalizedEvent {
  const aVariant = isTicketVariantListing(a.title);
  const bVariant = isTicketVariantListing(b.title);
  if (aVariant !== bVariant) {
    return aVariant ? mergeDuplicateFields(b, a) : mergeDuplicateFields(a, b);
  }

  const aAffiliate = hasAffiliateCheckout(a);
  const bAffiliate = hasAffiliateCheckout(b);
  if (aAffiliate !== bAffiliate) {
    return aAffiliate ? mergeDuplicateFields(a, b) : mergeDuplicateFields(b, a);
  }

  return richness(b) > richness(a) ? mergeDuplicateFields(b, a) : mergeDuplicateFields(a, b);
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
