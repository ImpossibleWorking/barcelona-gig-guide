import { isPlaceholderMidnight, SITE_TIME_ZONE, zonedDateTimeToIso } from "@/lib/datetime";
import { isBarcelonaMetroLocation } from "@/lib/geo";
import { normalizeForGigGuide } from "@/lib/gig-relevance";
import { EventGenre, NormalizedEvent } from "@/lib/types";

const USER_AGENT =
  "BarcelonaGigGuide/0.1 (+https://barcelonagigguide.com; venue-calendar sync)";

const FETCH_TIMEOUT_MS = 20_000;
const DETAIL_CONCURRENCY = 10;
const DEFAULT_SHOW_HOUR = 20;
const DEFAULT_SHOW_MINUTE = 30;

interface VenuePlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const PLACES: Record<string, VenuePlace> = {
  apolo: {
    name: "Sala Apolo",
    address: "Carrer Nou de la Rambla 113, 08004 Barcelona",
    latitude: 41.3744,
    longitude: 2.1696,
  },
  jamboree: {
    name: "Jamboree",
    address: "Plaça Reial 17, 08002 Barcelona",
    latitude: 41.3797,
    longitude: 2.1752,
  },
  upload: {
    name: "Sala Upload",
    address: "Avinguda Francesc Ferrer i Guàrdia, 08038 Barcelona",
    latitude: 41.3689,
    longitude: 2.149,
  },
  marula: {
    name: "Marula Café",
    address: "Carrer dels Escudellers 49, 08002 Barcelona",
    latitude: 41.3799,
    longitude: 2.1766,
  },
  harlem: {
    name: "Harlem Jazz Club",
    address: "Carrer de la Comtessa de Sobradiel 8, 08002 Barcelona",
    latitude: 41.3815,
    longitude: 2.1791,
  },
  p62: {
    name: "Paral·lel 62",
    address: "Avinguda del Paral·lel 62, 08001 Barcelona",
    latitude: 41.375,
    longitude: 2.169,
  },
};

const APOLO_CLUB_PATTERN =
  /\b(nitsa|bresh|milkshake|churros|antichurros|diablada|nalgas|oxido|óxido|duplex|d[uú]plex)\b/i;

const SKIP_TITLE_PATTERN =
  /\b(cerrado|tancat|closed for vacation|vacaciones|comunicado|aviso legal)\b/i;

const MONTHS: Record<string, number> = {
  january: 1,
  febrero: 2,
  february: 2,
  marzo: 3,
  march: 3,
  abril: 4,
  april: 4,
  mayo: 5,
  maig: 5,
  may: 5,
  junio: 6,
  juny: 6,
  june: 6,
  julio: 7,
  juliol: 7,
  july: 7,
  agosto: 8,
  agost: 8,
  august: 8,
  septiembre: 9,
  setiembre: 9,
  setembre: 9,
  september: 9,
  octubre: 10,
  october: 10,
  noviembre: 11,
  novembre: 11,
  november: 11,
  diciembre: 12,
  desembre: 12,
  december: 12,
  enero: 1,
  gener: 1,
  jan: 1,
  febrer: 2,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
  dec: 12,
};

type Json = Record<string, unknown>;

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const body = await fetchText(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  return JSON.parse(body) as T;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function parseEuro(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const match = raw.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function parseTime(raw: string | null | undefined): { hour: number; minute: number } | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function iberianDateFromText(text: string): { year: number; month: number; day: number } | null {
  const match = text.match(
    /\b(\d{1,2})\s+de\s+([a-záéíóúàèòç]+)\s+(?:de\s+)?(\d{4})\b/i
  );
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  return { day: Number(match[1]), month, year: Number(match[3]) };
}

function parseFlexibleDateTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  const apolo = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+[A-Z]+\s+(\d{1,2}):(\d{2})$/i);
  if (apolo) {
    return zonedDateTimeToIso(
      Number(apolo[1]),
      Number(apolo[2]),
      Number(apolo[3]),
      Number(apolo[4]),
      Number(apolo[5])
    );
  }

  const isoish = trimmed.replace(/T(\d{1,2}):(\d{2})([+-])(\d):(\d{2})$/, "T$1:$2$3:0$4:$5");
  const parsed = Date.parse(isoish);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();

  const iberian = iberianDateFromText(trimmed);
  if (iberian) {
    const time = parseTime(trimmed);
    return zonedDateTimeToIso(
      iberian.year,
      iberian.month,
      iberian.day,
      time?.hour ?? DEFAULT_SHOW_HOUR,
      time?.minute ?? DEFAULT_SHOW_MINUTE
    );
  }

  return null;
}

function applyDefaultShowtime(iso: string): string {
  if (!isPlaceholderMidnight(iso)) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return zonedDateTimeToIso(
    value("year"),
    value("month"),
    value("day"),
    DEFAULT_SHOW_HOUR,
    DEFAULT_SHOW_MINUTE
  );
}

function asRecord(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function jsonLdNodes(payload: unknown): Json[] {
  if (Array.isArray(payload)) return payload.flatMap(jsonLdNodes);
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record["@graph"])) return record["@graph"].flatMap(jsonLdNodes);
  return [record];
}

function jsonLdTypes(node: Json): string[] {
  const raw = node["@type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  return [];
}

function extractJsonLdEvents(html: string): Json[] {
  const events: Json[] = [];
  const blockRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(html))) {
    try {
      const parsed = JSON.parse(block[1]);
      for (const node of jsonLdNodes(parsed)) {
        const types = jsonLdTypes(node);
        if (types.some((type) => /Event$/i.test(type) || type === "Event")) {
          events.push(node);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return events;
}

function offerPrice(node: Json): { min: number | null; isFree: boolean } {
  const offers = node.offers;
  const offer = Array.isArray(offers) ? asRecord(offers[0]) : asRecord(offers);
  const price = parseEuro(offer?.price as string | number | undefined);
  const availability = String(offer?.availability ?? "");
  const isFree = price === 0 || /FreeEvent/i.test(String(node.isAccessibleForFree ?? ""));
  return { min: price, isFree: isFree || availability.includes("Free") };
}

function placeFromJsonLd(node: Json, fallback: VenuePlace): VenuePlace {
  const location = asRecord(node.location);
  const addressNode = asRecord(location?.address);
  const name =
    (typeof location?.name === "string" && location.name.trim()) || fallback.name;
  const street = typeof addressNode?.streetAddress === "string" ? addressNode.streetAddress : null;
  const locality = typeof addressNode?.addressLocality === "string" ? addressNode.addressLocality : "Barcelona";
  const postal = typeof addressNode?.postalCode === "string" ? addressNode.postalCode : null;
  const address = [street, locality, postal].filter(Boolean).join(", ") || fallback.address;
  return {
    name: decodeHtml(name),
    address,
    latitude: fallback.latitude,
    longitude: fallback.longitude,
  };
}

function resolveKnownPlace(name: string, fallback: VenuePlace): VenuePlace {
  const haystack = name.toLowerCase();
  if (haystack.includes("apolo")) return PLACES.apolo;
  if (haystack.includes("jamboree")) return PLACES.jamboree;
  if (haystack.includes("upload")) return PLACES.upload;
  if (haystack.includes("marula")) return PLACES.marula;
  if (haystack.includes("harlem")) return PLACES.harlem;
  if (haystack.includes("paral") && haystack.includes("62")) return PLACES.p62;
  return fallback;
}

function inferVenueGenre(title: string, venueName: string): EventGenre {
  const haystack = `${title} ${venueName}`;
  if (/\bfestival\b/i.test(haystack)) return "festival";
  if (APOLO_CLUB_PATTERN.test(haystack) || /\b(club night|dj set|disco)\b/i.test(haystack)) {
    return "clubbing";
  }
  if (/\b(comedy|comedia|stand[\s-]?up|mon[oó]logo)\b/i.test(haystack)) return "comedy";
  return "live-music";
}

function buildEvent(input: {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  place: VenuePlace;
  start: string;
  end?: string | null;
  price?: number | null;
  isFree?: boolean;
  image?: string | null;
  genre?: EventGenre;
}): NormalizedEvent | null {
  const title = decodeHtml(input.title);
  if (!title || SKIP_TITLE_PATTERN.test(title)) return null;

  const start = applyDefaultShowtime(input.start);
  if (Number.isNaN(new Date(start).getTime())) return null;
  if (new Date(start).getTime() < Date.now() - 12 * 60 * 60 * 1000) return null;

  const place = resolveKnownPlace(input.place.name, input.place);
  const event: NormalizedEvent = {
    id: input.id,
    source: "venue",
    source_url: input.url,
    title,
    description: input.description ? decodeHtml(input.description).slice(0, 2000) : null,
    venue_name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    start_datetime: start,
    end_datetime: input.end ?? null,
    price_min: input.isFree ? 0 : input.price ?? null,
    price_max: input.isFree ? 0 : input.price ?? null,
    is_free: Boolean(input.isFree) || input.price === 0,
    genre: input.genre ?? inferVenueGenre(title, place.name),
    image_url: input.image ?? null,
    last_synced_at: new Date().toISOString(),
  };

  if (!isBarcelonaMetroLocation(event.address, event.venue_name, event.latitude, event.longitude)) {
    return null;
  }

  return normalizeForGigGuide(event);
}

function eventFromJsonLd(
  node: Json,
  id: string,
  fallbackUrl: string,
  fallbackPlace: VenuePlace
): NormalizedEvent | null {
  const title = typeof node.name === "string" ? node.name : null;
  const start = parseFlexibleDateTime(typeof node.startDate === "string" ? node.startDate : null);
  if (!title || !start) return null;

  const { min, isFree } = offerPrice(node);
  const offers = Array.isArray(node.offers) ? asRecord(node.offers[0]) : asRecord(node.offers);
  const offerUrl = typeof offers?.url === "string" ? offers.url : null;
  const image =
    typeof node.image === "string"
      ? node.image
      : Array.isArray(node.image) && typeof node.image[0] === "string"
        ? node.image[0]
        : null;

  return buildEvent({
    id,
    url: offerUrl || (typeof node.url === "string" ? node.url : fallbackUrl),
    title,
    description: typeof node.description === "string" ? node.description : null,
    place: placeFromJsonLd(node, fallbackPlace),
    start,
    end: parseFlexibleDateTime(typeof node.endDate === "string" ? node.endDate : null),
    price: min,
    isFree,
    image,
  });
}

async function fetchApoloEvents(): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  const seen = new Set<string>();
  let offset = -1;
  let fecha = "";

  for (let page = 0; page < 24; page++) {
    const body = new URLSearchParams({
      token: fecha,
      offset: String(offset),
      "filter[date]": "",
      "filter[categoryType]": "",
      "filter[category]": "",
    });

    const raw = await fetchText("https://www.sala-apolo.com/es/load-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://www.sala-apolo.com",
        Referer: "https://www.sala-apolo.com/es/agenda",
      },
      body,
    });

    let parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    const payload = asRecord(parsed);
    if (!payload || payload.status !== "success" || typeof payload.html !== "string") break;

    for (const event of parseApoloHtml(payload.html)) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      events.push(event);
    }

    if (payload.end) break;
    offset = Number(payload.offset);
    fecha = String(payload.fecha ?? "");
    if (!Number.isFinite(offset)) break;
  }

  return events;
}

function parseApoloHtml(html: string): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  const cardRe =
    /href="(\/es\/evento\/[^"#]+)"[\s\S]*?c-leadMeta">([\s\S]*?)<\/span>\s*<a[^>]*class="c-results__event__title">([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = cardRe.exec(html))) {
    const path = match[1];
    const meta = decodeHtml(match[2]);
    const title = decodeHtml(match[3]).replace(/\s+Agotado\s*$/i, "").trim();
    const slugMatch = decodeURIComponent(path).match(/(\d{8})-(\d+)$/);
    const idMatch = decodeURIComponent(path).match(/-(\d+)$/);
    if (!idMatch) continue;

    let start: string | null = null;
    if (slugMatch) {
      const date = slugMatch[1];
      const time = parseTime(meta);
      start = zonedDateTimeToIso(
        Number(date.slice(0, 4)),
        Number(date.slice(4, 6)),
        Number(date.slice(6, 8)),
        time?.hour ?? DEFAULT_SHOW_HOUR,
        time?.minute ?? DEFAULT_SHOW_MINUTE
      );
    }

    if (!start) continue;

    const room = meta.split("·").map((part) => part.trim()).filter(Boolean).at(-2) ?? PLACES.apolo.name;
    const imageMatch = match[0].match(/src="([^"]+)"/);
    const image = imageMatch
      ? new URL(imageMatch[1], "https://www.sala-apolo.com").toString()
      : null;

    const built = buildEvent({
      id: `venue_apolo_${idMatch[1]}`,
      url: new URL(path, "https://www.sala-apolo.com").toString(),
      title,
      place: { ...PLACES.apolo, name: room.includes("Apolo") || room.includes("Nitsa") || room.includes("La (2)") || room.includes("La 2") ? room : PLACES.apolo.name },
      start,
      image,
      genre: inferVenueGenre(`${title} ${meta} ${room}`, room),
    });
    if (built) events.push(built);
  }

  return events;
}

interface TribeEvent {
  id: number | string;
  title?: string;
  description?: string;
  url?: string;
  website?: string;
  all_day?: boolean;
  start_date?: string;
  utc_start_date?: string;
  end_date?: string;
  utc_end_date?: string;
  image?: { url?: string } | false;
  cost?: string;
  cost_details?: { values?: string[] };
  venue?: {
    venue?: string;
    address?: string;
    city?: string;
    zip?: string;
  };
}

interface TribeResponse {
  events?: TribeEvent[];
  next_rest_url?: string;
  total_pages?: number;
}

async function fetchJamboreeEvents(): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  const today = new Date().toISOString().slice(0, 10);
  let nextUrl: string | undefined =
    `https://jamboreejazz.com/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}&status=publish`;

  for (let page = 0; page < 8 && nextUrl; page++) {
    const data: TribeResponse = await fetchJson<TribeResponse>(nextUrl);
    for (const raw of data.events ?? []) {
      const startRaw = raw.utc_start_date || raw.start_date;
      if (!startRaw) continue;
      const start = applyDefaultShowtime(new Date(startRaw.replace(" ", "T")).toISOString());
      const venueName = raw.venue?.venue || PLACES.jamboree.name;
      const address = [raw.venue?.address, raw.venue?.city || "Barcelona", raw.venue?.zip]
        .filter(Boolean)
        .join(", ");
      const priceValues = raw.cost_details?.values ?? [];
      const price = parseEuro(priceValues[0] ?? raw.cost);
      const built = buildEvent({
        id: `venue_jamboree_${raw.id}`,
        url: raw.website || raw.url || `https://jamboreejazz.com/`,
        title: raw.title ?? "Jamboree",
        description: raw.description ?? null,
        place: {
          ...PLACES.jamboree,
          name: venueName,
          address: address || PLACES.jamboree.address,
        },
        start,
        end: raw.utc_end_date ? new Date(raw.utc_end_date.replace(" ", "T")).toISOString() : null,
        price,
        isFree: price === 0,
        image: raw.image && raw.image.url ? raw.image.url : null,
      });
      if (built) events.push(built);
    }
    nextUrl = data.next_rest_url;
  }

  return events;
}

interface WpTitle {
  rendered?: string;
}

interface WpPost {
  id: number;
  slug?: string;
  link?: string;
  title?: WpTitle;
  content?: { rendered?: string };
  yoast_head_json?: {
    description?: string;
    og_image?: { url?: string }[];
    schema?: unknown;
  };
}

async function fetchWpPosts(url: string, maxPages = 6): Promise<WpPost[]> {
  const posts: WpPost[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = `${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${page}`;
    const body = await fetchText(pageUrl, { headers: { Accept: "application/json" } });
    const data = JSON.parse(body) as WpPost[] | { code?: string };
    if (!Array.isArray(data) || data.length === 0) break;
    posts.push(...data);
    if (data.length < 100) break;
  }
  return posts;
}

async function fetchMarulaEvents(): Promise<NormalizedEvent[]> {
  const posts = await fetchWpPosts("https://marulacafe.com/wp-json/wp/v2/evento");
  const results = await mapPool(posts, DETAIL_CONCURRENCY, async (post) => {
    if (!post.link) return null;
    try {
      const html = await fetchText(post.link);
      const nodes = extractJsonLdEvents(html);
      for (const node of nodes) {
        const built = eventFromJsonLd(node, `venue_marula_${post.id}`, post.link, PLACES.marula);
        if (built) return built;
      }
    } catch (error) {
      console.error(`Marula detail failed (${post.id}):`, error);
    }
    return null;
  });
  return results.filter((event): event is NormalizedEvent => event !== null);
}

async function fetchUploadEvents(): Promise<NormalizedEvent[]> {
  const posts = await fetchWpPosts("https://sala-upload.com/wp-json/wp/v2/eventos");
  const events: NormalizedEvent[] = [];

  for (const post of posts) {
    const title = decodeHtml(post.title?.rendered ?? "");
    const description = post.yoast_head_json?.description ?? "";
    const date = iberianDateFromText(`${description} ${title}`);
    if (!date) continue;

    const image = post.yoast_head_json?.og_image?.[0]?.url ?? null;
    const isFree = /gratis/i.test(description);
    const built = buildEvent({
      id: `venue_upload_${post.id}`,
      url: post.link || `https://sala-upload.com/`,
      title,
      description,
      place: PLACES.upload,
      start: zonedDateTimeToIso(date.year, date.month, date.day, DEFAULT_SHOW_HOUR, DEFAULT_SHOW_MINUTE),
      isFree,
      image,
      genre: /festival/i.test(title) ? "festival" : "live-music",
    });
    if (built) events.push(built);
  }

  return events;
}

async function fetchJazzBarcelonaEvents(): Promise<NormalizedEvent[]> {
  const posts = await fetchWpPosts("https://jazz.barcelona/wp-json/wp/v2/concert");
  const results = await mapPool(posts, DETAIL_CONCURRENCY, async (post) => {
    if (!post.link) return null;
    try {
      const html = await fetchText(post.link);
      const nodes = extractJsonLdEvents(html);
      for (const node of nodes) {
        const built = eventFromJsonLd(
          node,
          `venue_jazzbcn_${post.id}`,
          post.link,
          PLACES.p62
        );
        if (built) return built;
      }
    } catch (error) {
      console.error(`Jazz Barcelona detail failed (${post.id}):`, error);
    }
    return null;
  });
  return results.filter((event): event is NormalizedEvent => event !== null);
}

/**
 * Fetches upcoming gigs from official Barcelona venue calendars
 * (Sala Apolo, Jamboree, Marula Café, Sala Upload, Jazz Barcelona).
 */
export async function fetchVenueEvents(): Promise<NormalizedEvent[]> {
  const loaders: Array<[string, () => Promise<NormalizedEvent[]>]> = [
    ["apolo", fetchApoloEvents],
    ["jamboree", fetchJamboreeEvents],
    ["marula", fetchMarulaEvents],
    ["upload", fetchUploadEvents],
    ["jazz-barcelona", fetchJazzBarcelonaEvents],
  ];

  const batches = await Promise.all(
    loaders.map(async ([name, loader]) => {
      try {
        const events = await loader();
        console.info(`Venue source ${name}: ${events.length} events`);
        return events;
      } catch (error) {
        console.error(`Venue source ${name} failed:`, error);
        return [] as NormalizedEvent[];
      }
    })
  );

  const seen = new Set<string>();
  const events: NormalizedEvent[] = [];
  for (const event of batches.flat()) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    events.push(event);
  }
  return events;
}
