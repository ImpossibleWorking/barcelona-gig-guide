// Shared geography helpers for the Barcelona metro area
// (city + L'Hospitalet, Badalona, El Prat, Santa Coloma, Cornellà).

export const BARCELONA_CENTER = {
  latitude: 41.3874,
  longitude: 2.1686,
} as const;

export const MAP_CENTER: [number, number] = [
  BARCELONA_CENTER.latitude,
  BARCELONA_CENTER.longitude,
];

// Covers Barcelona city and the inner metro; excludes Sitges, Terrassa, Girona.
const METRO_BOUNDS = {
  minLat: 41.32,
  maxLat: 41.47,
  minLng: 2.05,
  maxLng: 2.28,
} as const;

export const METRO_AREA_NAMES = [
  "barcelona",
  "barna",
  "bcn",
  "eixample",
  "gràcia",
  "gracia",
  "el raval",
  "raval",
  "gòtic",
  "gotic",
  "gothic",
  "el born",
  "la barceloneta",
  "barceloneta",
  "poblenou",
  "poble nou",
  "poble-sec",
  "poble sec",
  "sants",
  "les corts",
  "sarrià",
  "sarria",
  "horta",
  "nou barris",
  "sant martí",
  "sant marti",
  "ciutat vella",
  "montjuïc",
  "montjuic",
  "fòrum",
  "forum",
  "22@",
  "el prat",
  "hospitalet",
  "l'hospitalet",
  "badalona",
  "cornellà",
  "cornella",
  "sant adrià",
  "sant adria",
  "santa coloma",
  "esplugues",
  "zona franca",
  "paral·lel",
  "parallel",
  "port olímpic",
  "port olimpic",
] as const;

const OUT_OF_AREA_NAMES = [
  "madrid",
  "valencia",
  "sevilla",
  "seville",
  "bilbao",
  "málaga",
  "malaga",
  "girona",
  "sitges",
  "tarragona",
  "palma",
  "ibiza",
  "eivissa",
  "lisbon",
  "lisboa",
  "paris",
  "london",
] as const;

const METRO_VENUE_HINTS = [
  "razzmatazz",
  "sala apolo",
  "nitsa",
  "jamboree",
  "palau sant jordi",
  "palau de la música",
  "palau de la musica",
  "barts",
  "sala bikini",
  "sidecar",
  "heliogàbal",
  "heliogabal",
  "sala upload",
  "poble espanyol",
  "gran teatre del liceu",
  "l'auditori",
  "auditori de barcelona",
  "sala bòveda",
  "sala boveda",
  "paral·lel 62",
  "parallel 62",
  "harlem jazz",
  "velvet room",
  "comedy clubhouse",
  "ocaña",
  "ocana",
] as const;

function inMetroBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= METRO_BOUNDS.minLat &&
    latitude <= METRO_BOUNDS.maxLat &&
    longitude >= METRO_BOUNDS.minLng &&
    longitude <= METRO_BOUNDS.maxLng
  );
}

/** True when an event is in the Barcelona metro area. */
export function isBarcelonaMetroLocation(
  address: string | null | undefined,
  venueName?: string | null,
  latitude?: number | null,
  longitude?: number | null
): boolean {
  if (latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
    return inMetroBounds(latitude, longitude);
  }

  const normalizedAddress = (address ?? "").toLowerCase();
  const venue = (venueName ?? "").toLowerCase();
  const haystack = `${normalizedAddress} ${venue}`;

  if (OUT_OF_AREA_NAMES.some((area) => haystack.includes(area))) {
    return false;
  }

  if (METRO_AREA_NAMES.some((area) => haystack.includes(area))) return true;

  const postcode = haystack.replace(/\s/g, "").match(/\b08\d{3}\b/)?.[0];
  if (postcode) {
    const district = Number.parseInt(postcode, 10);
    // 08001–08042 city; 08820 El Prat; 089xx Hospitalet / Badalona / Santa Coloma / Cornellà.
    if (district >= 8001 && district <= 8042) return true;
    if (district === 8820) return true;
    if (district >= 8901 && district <= 8950) return true;
  }

  return METRO_VENUE_HINTS.some((hint) => venue.includes(hint));
}
