import { EventGenre, NormalizedEvent } from "@/lib/types";

const GIG_GENRES = new Set<EventGenre>(["live-music", "clubbing", "festival", "comedy"]);

const GIG_TITLE_PATTERN =
  /\b(festival|gig|live|concert|concierto|music|m[uú]sica|comedy|comedia|stand[\s-]?up|standup|dj|part(y|ies)|fiesta|disco|band|orchestra|orquesta|cabaret|nights?|tribute|quiz|flamenco|rumba|directo|mon[oó]logo)\b/i;

/** Titles that look like gigs but aren't (workshops, markets, talks, etc.). */
const NON_GIG_TITLE_PATTERN =
  /\b(workshop|taller|makers?\s*market|market\b|mercado|wine\s*tast|cata\s*de\s*vinos|life\s*drawing|gong\s*bath|sonic\s*bath|wellbeing|lecture|conferencia|poetry\s*reading|young\s*writers|film\b|pel[ií]cula|dance\s*class|clase\s*de\s*baile|drag\s*bingo|season\s*ticket|arts?\s*workshop)\b/i;

/** True when an event belongs on a gig guide (live music, clubbing, festivals, comedy). */
export function isGigRelevantEvent(event: NormalizedEvent): boolean {
  if (NON_GIG_TITLE_PATTERN.test(event.title)) return false;

  if (event.genre && GIG_GENRES.has(event.genre)) return true;

  return GIG_TITLE_PATTERN.test(event.title);
}

/** Infer a better genre from title when sources leave events as "other". */
export function refineGenre(event: NormalizedEvent): EventGenre | null {
  if (event.genre && event.genre !== "other") return event.genre;

  const title = event.title;
  const normalized = title.toLowerCase();

  if (normalized.includes("festival")) return "festival";
  if (/\b(comedy|comedia|stand[\s-]?up|standup|comedian|c[oó]mico|mon[oó]logo)\b/i.test(title)) {
    return "comedy";
  }
  if (
    normalized.includes("club night") ||
    normalized.includes("music quiz") ||
    normalized.includes("disco") ||
    normalized.includes("fiesta") ||
    /\bdj\b/.test(normalized)
  ) {
    return "clubbing";
  }
  if (
    /\b(orchestra|orquesta|concert|concierto|live|directo|band|gig|tribute|salsa|jazz|funk|swing|cabaret|flamenco)\b/i.test(
      title
    )
  ) {
    return "live-music";
  }

  return event.genre;
}

export function normalizeForGigGuide(event: NormalizedEvent): NormalizedEvent | null {
  const genre = refineGenre(event) ?? event.genre;
  const normalized = { ...event, genre };

  return isGigRelevantEvent(normalized) ? normalized : null;
}
