import { SITE_URL } from "@/lib/site";

export const SITE_NAME = "Barcelona Gig Guide";

export const SITE_DESCRIPTION =
  "Barcelona concerts, English comedy, jazz, and club nights this week — with ticket links. Updated daily from Eventbrite, Ticketmaster, Fever, venue calendars, and the city agenda.";

export const SITE_KEYWORDS = [
  "Barcelona concerts",
  "Barcelona concerts this week",
  "Barcelona tickets",
  "concerts in Barcelona tonight",
  "live music Barcelona",
  "English comedy Barcelona",
  "stand-up Barcelona",
  "jazz Barcelona",
  "club nights Barcelona",
  "what to do in Barcelona tonight",
  "Razzmatazz tickets",
  "Sala Apolo",
  "Palau Sant Jordi",
  "Jamboree jazz",
  "gig guide Barcelona",
  "conciertos Barcelona",
  "entradas conciertos Barcelona",
];

export const OG_IMAGE_PATH = "/logo.png";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** Indexable event page (not the affiliate /go hop). */
export function getEventPath(eventId: string): string {
  return `/e/${encodeURIComponent(eventId)}`;
}

export function getEventUrl(eventId: string, siteUrl = SITE_URL): string {
  return `${siteUrl.replace(/\/$/, "")}${getEventPath(eventId)}`;
}
