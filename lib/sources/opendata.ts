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

const IMAGE_FETCH_CONCURRENCY = 10;
const IMAGE_FETCH_TIMEOUT_MS = 8000;
const GENERIC_IMAGE_PATTERN =
  /default_images|guia_482x252|mark-agenda|barcelona_600x315/i;
const GUIA_PHOTO_PATTERN =
  /class="img-guia"[^>]*>\s*<img[^>]+src="([^"]+)"/i;
const NASIA_PHOTO_PATTERN = /https:\/\/estatics-nasia\.dtibcn\.cat\/[^"'>\s]+/i;
const DESCRIPTION_MAX_LENGTH = 1500;

function isUsableGuiaImage(url: string): boolean {
  return /^https?:\/\//i.test(url) && !GENERIC_IMAGE_PATTERN.test(url);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function extractGuiaImage(html: string): string | null {
  const fromBox = html.match(GUIA_PHOTO_PATTERN)?.[1];
  if (fromBox && isUsableGuiaImage(fromBox)) return fromBox;
  const nasia = html.match(NASIA_PHOTO_PATTERN)?.[0];
  return nasia && isUsableGuiaImage(nasia) ? nasia : null;
}

function extractGuiaDescription(html: string): string | null {
  const blocks = Array.from(html.matchAll(/<div class="cos">([\s\S]*?)<\/div>/gi))
    .map((match) => htmlToPlainText(match[1]))
    .filter((text) => text.length > 40);
  if (blocks.length === 0) return null;

  const combined = blocks.join("\n\n");
  if (combined.length <= DESCRIPTION_MAX_LENGTH) return combined;
  return `${combined.slice(0, DESCRIPTION_MAX_LENGTH).replace(/\s+\S*$/, "").trim()}…`;
}

function extractGuiaPrices(html: string): {
  price_min: number | null;
  price_max: number | null;
  is_free: boolean;
} {
  const section =
    html.match(
      /id="div-informacio"[\s\S]*?(id="div-com-arribar"|id="contingut-addicional")/i
    )?.[0] ?? "";
  const amounts = Array.from(section.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g))
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((amount) => Number.isFinite(amount) && amount >= 0 && amount < 500);
  const is_free = FREE_PATTERN.test(section) || amounts.some((amount) => amount === 0);

  if (amounts.length === 0) {
    return { price_min: null, price_max: null, is_free };
  }

  const price_min = Math.min(...amounts);
  const price_max = Math.max(...amounts);
  return { price_min, price_max, is_free: is_free || price_min === 0 };
}

interface GuiaDetails {
  image_url: string | null;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean;
}

async function fetchGuiaDetails(sourceUrl: string): Promise<GuiaDetails | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "BarcelonaGigGuide/1.0 (+https://barcelonagigguide.com)",
      },
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return {
      image_url: extractGuiaImage(html),
      description: extractGuiaDescription(html),
      ...extractGuiaPrices(html),
    };
  } catch {
    return null;
  }
}

async function enrichFromGuia(events: NormalizedEvent[]): Promise<NormalizedEvent[]> {
  const enriched = events.slice();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < enriched.length) {
      const index = nextIndex++;
      const event = enriched[index];
      if (!event) continue;
      const details = await fetchGuiaDetails(event.source_url);
      if (!details) continue;
      enriched[index] = {
        ...event,
        image_url: details.image_url ?? event.image_url,
        description: details.description ?? event.description,
        price_min: details.price_min ?? event.price_min,
        price_max: details.price_max ?? event.price_max,
        is_free: event.is_free || details.is_free,
      };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_FETCH_CONCURRENCY, enriched.length) }, () => worker())
  );

  return enriched;
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

  return enrichFromGuia(events);
}
