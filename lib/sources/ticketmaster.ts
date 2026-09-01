import { EventGenre, NormalizedEvent } from "@/lib/types";
import { BARCELONA_CENTER, isBarcelonaMetroLocation } from "@/lib/geo";

// Ticketmaster Discovery API v2
// https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
//
// Spain is on the Discovery catalogue (countryCode=ES). Free tier: 5,000
// calls/day, 5 req/sec. We search by geoPoint around Barcelona rather than
// city name so Hospitalet / Badalona / El Prat listings aren't dropped.

const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

const COUNTRY_CODE = "ES";
const SEARCH_RADIUS_KM = 18;
const PAGE_SIZE = 200; // Discovery API's max page size
const MAX_PAGES = 4; // API caps deep paging at size*page < 1000 total results

const CLASSIFICATIONS = ["Music", "Comedy"] as const;

interface TicketmasterImage {
  url?: string;
  width?: number;
  ratio?: string;
}

interface TicketmasterVenue {
  name?: string;
  address?: { line1?: string };
  city?: { name?: string };
  postalCode?: string;
  location?: { latitude?: string; longitude?: string };
}

interface TicketmasterClassification {
  segment?: { name?: string };
  genre?: { name?: string };
}

interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: { dateTime?: string };
    end?: { dateTime?: string };
  };
  priceRanges?: { min?: number; max?: number }[];
  images?: TicketmasterImage[];
  classifications?: TicketmasterClassification[];
  _embedded?: { venues?: TicketmasterVenue[] };
}

interface TicketmasterResponse {
  _embedded?: { events?: TicketmasterEvent[] };
  page?: { totalPages?: number };
}

const COMEDY_TITLE_PATTERN = /\b(comedy|comedia|stand[\s-]?up|standup|comedian|c[oó]mico|mon[oó]logo)\b/i;

function inferGenre(event: TicketmasterEvent): EventGenre {
  const title = event.name;
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("festival")) return "festival";

  const genreName = (event.classifications?.[0]?.genre?.name ?? "").toLowerCase();
  if (genreName.includes("comedy") || COMEDY_TITLE_PATTERN.test(title)) {
    return "comedy";
  }
  if (genreName.includes("dance") || genreName.includes("electronic") || genreName.includes("club")) {
    return "clubbing";
  }

  const segmentName = event.classifications?.[0]?.segment?.name ?? "";
  if (segmentName === "Music") return "live-music";

  return "other";
}

function pickImage(images: TicketmasterImage[] | undefined): string | null {
  if (!images?.length) return null;
  const widescreen = images.find((image) => image.ratio === "16_9" && (image.width ?? 0) >= 640);
  return (widescreen ?? images[0]).url ?? null;
}

function mapTicketmasterEvent(event: TicketmasterEvent): NormalizedEvent | null {
  const startDatetime = event.dates?.start?.dateTime;
  if (!startDatetime) return null; // skip dateTBA events we can't place on the calendar

  const venue = event._embedded?.venues?.[0];
  const priceRange = event.priceRanges?.[0];
  const latitude = venue?.location?.latitude ? Number(venue.location.latitude) : null;
  const longitude = venue?.location?.longitude ? Number(venue.location.longitude) : null;
  const address =
    [venue?.address?.line1, venue?.city?.name, venue?.postalCode].filter(Boolean).join(", ") || null;

  return {
    id: `ticketmaster_${event.id}`,
    source: "ticketmaster",
    source_url: event.url ?? "https://www.ticketmaster.es/",
    title: event.name,
    description: null,
    venue_name: venue?.name ?? "Unknown venue",
    address,
    latitude,
    longitude,
    start_datetime: startDatetime,
    end_datetime: event.dates?.end?.dateTime ?? null,
    price_min: priceRange?.min ?? null,
    price_max: priceRange?.max ?? null,
    is_free: priceRange?.min === 0 && priceRange?.max === 0,
    genre: inferGenre(event),
    image_url: pickImage(event.images),
    last_synced_at: new Date().toISOString(),
  };
}

async function fetchEventsForClassification(
  apiKey: string,
  classificationName: string,
  startDateTime: string
): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      apikey: apiKey,
      latlong: `${BARCELONA_CENTER.latitude},${BARCELONA_CENTER.longitude}`,
      radius: String(SEARCH_RADIUS_KM),
      unit: "km",
      countryCode: COUNTRY_CODE,
      classificationName,
      startDateTime,
      size: String(PAGE_SIZE),
      page: String(page),
    });

    let response: Response;
    try {
      response = await fetch(`${TICKETMASTER_BASE_URL}?${params.toString()}`);
    } catch (error) {
      console.error(
        `Ticketmaster API request failed (${classificationName}, page ${page}):`,
        error
      );
      break;
    }

    if (!response.ok) {
      console.error(`Ticketmaster API error (${classificationName}, page ${page}): ${response.status}`);
      break;
    }

    const data: TicketmasterResponse = await response.json();
    const rawEvents = data._embedded?.events ?? [];

    for (const raw of rawEvents) {
      const mapped = mapTicketmasterEvent(raw);
      if (
        mapped &&
        isBarcelonaMetroLocation(mapped.address, mapped.venue_name, mapped.latitude, mapped.longitude)
      ) {
        events.push(mapped);
      }
    }

    const totalPages = data.page?.totalPages ?? 1;
    if (page + 1 >= totalPages || rawEvents.length === 0) break;
  }

  return events;
}

/**
 * Fetches music and comedy events in the Barcelona metro from Ticketmaster's
 * Discovery API and maps them into the normalized event schema.
 */
export async function fetchTicketmasterEvents(): Promise<NormalizedEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.warn("TICKETMASTER_API_KEY is not set — skipping Ticketmaster sync.");
    return [];
  }

  const allEvents: NormalizedEvent[] = [];
  // Ticketmaster rejects the milliseconds Date#toISOString() includes —
  // strip them down to "YYYY-MM-DDThh:mm:ssZ".
  const startDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  for (const classificationName of CLASSIFICATIONS) {
    try {
      const events = await fetchEventsForClassification(apiKey, classificationName, startDateTime);
      allEvents.push(...events);
    } catch (error) {
      console.error(`Failed to fetch Ticketmaster events for ${classificationName}:`, error);
    }
  }

  const seen = new Set<string>();
  return allEvents.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
