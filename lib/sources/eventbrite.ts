import { EventGenre, NormalizedEvent } from "@/lib/types";
import { toTimeZoneWeekday } from "@/lib/datetime";
import { canonicalEventTitle, normalizeForDedup } from "@/lib/dedupe";
import { isBarcelonaMetroLocation } from "@/lib/geo";
import { normalizeForGigGuide } from "@/lib/gig-relevance";

// Eventbrite API v3 — organizer events
// https://www.eventbrite.com/platform/api
//
// IMPORTANT: Eventbrite deprecated its free-text/location event *search* API
// back in 2019. There is no supported way to ask "give me all music events
// in Barcelona" directly. The only reliable way to pull events for a city is
// to query known organizers (venues/promoters) one at a time via
// GET /organizers/{organizer_id}/events/, which *is* still public.
//
// Find an organizer_id via GET /events/{id}/ on one of their public event
// pages, or from the numeric suffix on eventbrite.es/o/{slug}-{organizer_id}.
const BARCELONA_ORGANIZER_IDS: string[] = [
  // Jazz, live rooms & bars
  "50358669263", // Velvet Room Bcn
  "96768207773", // Ocaña en Vivo
  "73677133853", // Aclam Club
  "115618506621", // El Duende by Tablao Cordobes
  "58869923893", // BYRON Live Concerts
  "26919582185", // MUV Banda (Marula Café)
  "49556785093", // Casa Astor
  "111073976041", // Sala Vivaldi
  "121656091933", // WIP RECORDS
  "23421715321", // Royal Jelly Music
  "109686430741", // Carlos Montoya
  "121604273727", // Rajnandini Music
  "65168628333", // AMAFEST
  "121510317606", // Célebre Cabaret
  "67082492253", // Quiziera
  // Comedy
  "58689016343", // The Comedy Clubhouse BCN
  "60403957483", // Secret Comedy Club
  "18236694475", // Barcelona Comedy Club
  "38120356583", // Massa Comedy
  "20095681930", // Lluís Vendrell Comedy
  "65343604653", // Hector Ayala (Basemint / Uranus)
  "76451167103", // TBC Improv Spain
  "56880907563", // Barcelona Improv Group
  "76630050583", // Jokes & Beers
  "19913660638", // the Comedy Nomad
  "47480774033", // Antonio Lorente Comedy
  "61244268773", // AtoMIC Comedy
  // Clubs & promoters
  "112953763081", // VICE UNIVERSE
  "121158035775", // Colors Club
  "120903321167", // Lyli Events (Island Beats / live parties)
  "121222963107", // Resonancia Entertainment (concerts & festivals)
  "16669209352", // STUDIO 54 BARCELONA
  "17539819258", // Jackies (La Terrrazza / house)
  "71143058633", // Fury (hard techno)
  "69001874533", // Moods (W Barcelona Noxe)
  "89901525123", // RUMBON Latin Party
];

const EVENTBRITE_BASE_URL = "https://www.eventbriteapi.com/v3";

const MUSIC_CATEGORY_ID = "103";

const COMEDY_TITLE_PATTERN =
  /\b(comedy|comedia|stand[\s-]?up|standup|comedian|c[oó]mico|mon[oó]logo)\b/i;

const MAX_PAGES_PER_ORGANIZER = 5; // safety cap
const ORGANIZER_CONCURRENCY = 6;

interface EventbriteMoney {
  currency: string;
  value: number;
  major_value: string;
  display: string;
}

interface EventbriteVenue {
  name?: string;
  address?: {
    address_1?: string;
    city?: string;
    postal_code?: string;
    latitude?: string;
    longitude?: string;
  };
}

interface EventbriteEvent {
  id: string;
  name?: { text?: string };
  description?: { text?: string };
  url?: string;
  start?: { utc?: string };
  end?: { utc?: string };
  is_free?: boolean;
  category_id?: string;
  logo?: { url?: string; original?: { url?: string } };
  venue?: EventbriteVenue;
  ticket_availability?: {
    minimum_ticket_price?: EventbriteMoney;
    maximum_ticket_price?: EventbriteMoney;
  };
}

interface EventbriteEventsResponse {
  pagination?: {
    page_number: number;
    page_count: number;
    has_more_items: boolean;
  };
  events?: EventbriteEvent[];
}

function isLocalEvent(event: NormalizedEvent): boolean {
  return isBarcelonaMetroLocation(
    event.address,
    event.venue_name,
    event.latitude,
    event.longitude
  );
}

function inferGenre(event: EventbriteEvent): EventGenre {
  const title = event.name?.text ?? "";
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("festival")) return "festival";
  if (
    normalizedTitle.includes("club night") ||
    normalizedTitle.includes("clubbing") ||
    normalizedTitle.includes("music quiz") ||
    normalizedTitle.includes("disco") ||
    normalizedTitle.includes("fiesta") ||
    /\bdj\b/.test(normalizedTitle)
  ) {
    return "clubbing";
  }
  if (COMEDY_TITLE_PATTERN.test(title)) return "comedy";
  if (event.category_id === MUSIC_CATEGORY_ID) return "live-music";
  return "other";
}

function mapEventbriteEvent(event: EventbriteEvent): NormalizedEvent | null {
  if (!event.start?.utc) return null;

  const minPrice = event.ticket_availability?.minimum_ticket_price;
  const maxPrice = event.ticket_availability?.maximum_ticket_price;

  return {
    id: `eventbrite_${event.id}`,
    source: "eventbrite",
    source_url: event.url ?? "https://www.eventbrite.es/",
    title: event.name?.text ?? "Untitled event",
    description: event.description?.text ?? null,
    venue_name: event.venue?.name ?? "Unknown venue",
    address:
      [event.venue?.address?.address_1, event.venue?.address?.city, event.venue?.address?.postal_code]
        .filter(Boolean)
        .join(", ") || null,
    latitude: event.venue?.address?.latitude ? Number(event.venue.address.latitude) : null,
    longitude: event.venue?.address?.longitude ? Number(event.venue.address.longitude) : null,
    start_datetime: event.start.utc,
    end_datetime: event.end?.utc ?? null,
    price_min: minPrice ? Number(minPrice.major_value) : event.is_free ? 0 : null,
    price_max: maxPrice ? Number(maxPrice.major_value) : event.is_free ? 0 : null,
    is_free: event.is_free ?? false,
    genre: inferGenre(event),
    image_url: event.logo?.original?.url ?? event.logo?.url ?? null,
    last_synced_at: new Date().toISOString(),
  };
}

function dedupeRecurringEventbriteEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  const byKey = new Map<string, NormalizedEvent>();

  for (const event of events) {
    const weekday = toTimeZoneWeekday(event.start_datetime);
    const key = `${canonicalEventTitle(event.title)}|${normalizeForDedup(event.venue_name)}|${weekday}`;
    const existing = byKey.get(key);
    if (!existing || event.start_datetime < existing.start_datetime) {
      byKey.set(key, event);
    }
  }

  return Array.from(byKey.values());
}

async function fetchEventsForOrganizer(
  token: string,
  organizerId: string
): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];

  for (let page = 1; page <= MAX_PAGES_PER_ORGANIZER; page++) {
    const params = new URLSearchParams({
      status: "live",
      order_by: "start_asc",
      expand: "venue,ticket_availability",
      "start_date.range_start": new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      page: String(page),
    });

    const response = await fetch(
      `${EVENTBRITE_BASE_URL}/organizers/${organizerId}/events/?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error(`Eventbrite API error (organizer ${organizerId}, page ${page}): ${response.status}`);
      break;
    }

    const data: EventbriteEventsResponse = await response.json();
    for (const raw of data.events ?? []) {
      const mapped = mapEventbriteEvent(raw);
      if (!mapped || !isLocalEvent(mapped)) continue;
      const normalized = normalizeForGigGuide(mapped);
      if (normalized) events.push(normalized);
    }

    if (!data.pagination?.has_more_items) break;
  }

  return events;
}

/**
 * Fetches events from known Barcelona organizers on Eventbrite and maps them
 * into the normalized event schema.
 */
export async function fetchEventbriteEvents(): Promise<NormalizedEvent[]> {
  const token = process.env.EVENTBRITE_API_KEY;
  if (!token) {
    console.warn("EVENTBRITE_API_KEY is not set — skipping Eventbrite sync.");
    return [];
  }

  if (BARCELONA_ORGANIZER_IDS.length === 0) {
    console.warn("BARCELONA_ORGANIZER_IDS is empty — see lib/sources/eventbrite.ts.");
    return [];
  }

  const apiToken = token;
  const allEvents: NormalizedEvent[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < BARCELONA_ORGANIZER_IDS.length) {
      const organizerId = BARCELONA_ORGANIZER_IDS[nextIndex++];
      if (!organizerId) continue;
      try {
        const events = await fetchEventsForOrganizer(apiToken, organizerId);
        allEvents.push(...events);
      } catch (error) {
        console.error(`Failed to fetch Eventbrite events for organizer ${organizerId}:`, error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(ORGANIZER_CONCURRENCY, BARCELONA_ORGANIZER_IDS.length) }, () =>
      worker()
    )
  );

  const seen = new Set<string>();
  const dedupedById = allEvents.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });

  return dedupeRecurringEventbriteEvents(dedupedById);
}
