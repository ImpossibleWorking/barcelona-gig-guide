import { EventGenre, NormalizedEvent } from "@/lib/types";
import { SITE_TIME_ZONE, toTimeZoneDateString } from "@/lib/datetime";
import { isBarcelonaMetroLocation } from "@/lib/geo";
import { normalizeForGigGuide } from "@/lib/gig-relevance";

// Ajuntament de Barcelona cultural agenda (CKAN datastore).
// https://opendata-ajuntament.barcelona.cat/data/en/dataset/agenda-cultural
// CC BY 4.0 — link each listing back to Guia Barcelona.
const DATASTORE_SQL_URL =
  "https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search_sql";
const CULTURAL_AGENDA_RESOURCE_ID = "3abb2414-1ee0-446e-9c25-380e938adb73";
const GUIA_DETAIL_BASE = "https://guia.barcelona.cat/es/agenda/detall";

const GIG_TITLE_PATTERN =
  /\b(festival|concerts?|conciertos?|m[uú]sica|jazz|flamenco|rumba|comedy|comedia|com[eè]dia|stand[\s-]?up|standup|mon[oó]leg|mon[oó]logo|dj|fiesta|disco|orquestra|orquesta|[oò]pera|havaneres|cantautor|jam\s*session|directe|en vivo|live)\b/i;

const NON_GIG_TITLE_PATTERN =
  /\b(taller|workshop|exposici[oó]n?|visita|itinerari|cine|cinema|pel[ií]cula|confer[eè]ncia|xerrada|club de lectura|cercavila|cer[aà]mica|scrabble|dibuix|yoga|meditaci)\b/i;

const MONTHLY_PROGRAMME_PATTERN =
  /^(concerts?|conciertos?|programaci[oó]n)\s+(gener|febrer|mar[cç]|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|enero|febrero|marzo|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i;

const FREE_PATTERN = /\b(gratu[ií]t[aeo]?s?|entrada lliure|entrada libre|free admission|free entry)\b/i;

const COMEDY_PATTERN =
  /\b(comedy|comedia|com[eè]dia|stand[\s-]?up|standup|mon[oó]leg|mon[oó]logo)\b/i;

interface OpenDataRecord {
  register_id?: string;
  name?: string;
  institution_name?: string;
  start_date?: string;
  end_date?: string;
  addresses_road_name?: string;
  addresses_start_street_number?: string | number | null;
  addresses_neighborhood_name?: string;
  addresses_zip_code?: string | number | null;
  addresses_town?: string;
  geo_epgs_4326_lat?: string | number | null;
  geo_epgs_4326_lon?: string | number | null;
}

interface DatastoreSqlResponse {
  success?: boolean;
  result?: { records?: OpenDataRecord[] };
}

function cleanTitle(raw: string): string {
  const unquoted = raw.replace(/""/g, '"').replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();
  const withoutPrefix = unquoted
    .replace(/^(concerts?|conciertos?)\s+/i, "")
    .replace(/^["«»]+|["«»]+$/g, "")
    .trim();
  return withoutPrefix || unquoted;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function registerId(raw: string | undefined): string | null {
  const id = (raw ?? "").replace(/^\ufeff/, "").trim();
  return id || null;
}

function guiaUrl(title: string, id: string): string {
  const slug = slugify(title) || "acte";
  return `${GUIA_DETAIL_BASE}/${slug}_${id}.html`;
}

function padZip(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  return String(value).replace(/\D/g, "").padStart(5, "0");
}

function venueName(record: OpenDataRecord): string {
  const institution = record.institution_name?.trim();
  if (institution) return institution;

  const road = record.addresses_road_name?.trim();
  const hood = record.addresses_neighborhood_name?.trim();
  if (road && hood) return `${road}, ${hood}`;
  return road || hood || "Barcelona";
}

function buildAddress(record: OpenDataRecord): string | null {
  const number = record.addresses_start_street_number;
  const road = record.addresses_road_name?.trim();
  const street = [road, number != null && number !== "" ? String(number) : null]
    .filter(Boolean)
    .join(" ");
  const parts = [
    street || null,
    record.addresses_neighborhood_name?.trim() || null,
    record.addresses_town?.trim() || "Barcelona",
    padZip(record.addresses_zip_code),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function parseCoordinate(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** City feed often stores date-only rows as ~03:00 local. Treat those as 20:00 Madrid. */
function resolveStartDatetime(raw: string): string | null {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: SITE_TIME_ZONE,
    }).format(date)
  );
  if (hour >= 8) return date.toISOString();

  const ymd = toTimeZoneDateString(date);
  for (const offset of ["+02:00", "+01:00"] as const) {
    const candidate = new Date(`${ymd}T20:00:00${offset}`);
    const backHour = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: SITE_TIME_ZONE,
    }).format(candidate);
    if (backHour === "20" && toTimeZoneDateString(candidate) === ymd) {
      return candidate.toISOString();
    }
  }

  return date.toISOString();
}

function inferGenre(title: string, start: string, end: string | null): EventGenre {
  const normalized = title.toLowerCase();
  if (normalized.includes("festival")) return "festival";
  if (COMEDY_PATTERN.test(title)) return "comedy";
  if (
    normalized.includes("club night") ||
    normalized.includes("disco") ||
    normalized.includes("fiesta") ||
    /\bdj\b/.test(normalized)
  ) {
    return "clubbing";
  }

  if (end) {
    const startDay = toTimeZoneDateString(start);
    const endDay = toTimeZoneDateString(end);
    if (endDay > startDay && /festival|festa major/i.test(title)) return "festival";
  }

  return "live-music";
}

function isGigLikeTitle(title: string): boolean {
  if (NON_GIG_TITLE_PATTERN.test(title)) return false;
  if (MONTHLY_PROGRAMME_PATTERN.test(title)) return false;
  return GIG_TITLE_PATTERN.test(title);
}

function mapOpenDataRecord(record: OpenDataRecord): NormalizedEvent | null {
  const id = registerId(record.register_id);
  const rawTitle = record.name?.trim();
  const startRaw = record.start_date?.trim();
  if (!id || !rawTitle || !startRaw) return null;
  if (!isGigLikeTitle(rawTitle)) return null;

  const title = cleanTitle(rawTitle);
  const startDatetime = resolveStartDatetime(startRaw);
  if (!startDatetime) return null;

  const endDatetime = record.end_date ? resolveStartDatetime(record.end_date) : null;
  const latitude = parseCoordinate(record.geo_epgs_4326_lat);
  const longitude = parseCoordinate(record.geo_epgs_4326_lon);
  const venue = venueName(record);
  const address = buildAddress(record);

  return {
    id: `opendata_${id}`,
    source: "opendata",
    source_url: guiaUrl(rawTitle.replace(/""/g, '"').replace(/^"+|"+$/g, ""), id),
    title,
    description: null,
    venue_name: venue,
    address,
    latitude,
    longitude,
    start_datetime: startDatetime,
    end_datetime: endDatetime && endDatetime > startDatetime ? endDatetime : null,
    price_min: null,
    price_max: null,
    is_free: FREE_PATTERN.test(rawTitle),
    genre: inferGenre(rawTitle, startDatetime, endDatetime),
    image_url: null,
    last_synced_at: new Date().toISOString(),
  };
}

async function fetchUpcomingRecords(): Promise<OpenDataRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  const sql = `SELECT register_id, name, institution_name, start_date, end_date, addresses_road_name, addresses_start_street_number, addresses_neighborhood_name, addresses_zip_code, addresses_town, geo_epgs_4326_lat, geo_epgs_4326_lon FROM "${CULTURAL_AGENDA_RESOURCE_ID}" WHERE start_date >= '${today}'`;

  const response = await fetch(`${DATASTORE_SQL_URL}?sql=${encodeURIComponent(sql)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Open Data BCN request failed: ${response.status}`);
  }

  const data: DatastoreSqlResponse = await response.json();
  if (!data.success) {
    throw new Error("Open Data BCN SQL query was rejected");
  }

  return data.result?.records ?? [];
}

/**
 * Fetches upcoming music/comedy listings from Barcelona's cultural agenda
 * and maps them into the normalized event schema.
 */
export async function fetchOpenDataEvents(): Promise<NormalizedEvent[]> {
  let records: OpenDataRecord[];
  try {
    records = await fetchUpcomingRecords();
  } catch (error) {
    console.error("Open Data BCN fetch failed:", error);
    return [];
  }

  const seen = new Set<string>();
  const events: NormalizedEvent[] = [];

  for (const record of records) {
    const mapped = mapOpenDataRecord(record);
    if (!mapped) continue;
    if (seen.has(mapped.id)) continue;
    if (
      !isBarcelonaMetroLocation(mapped.address, mapped.venue_name, mapped.latitude, mapped.longitude)
    ) {
      continue;
    }
    const normalized = normalizeForGigGuide(mapped);
    if (!normalized) continue;
    seen.add(mapped.id);
    events.push(normalized);
  }

  return events;
}
