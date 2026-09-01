import { SITE_URL } from "@/lib/site";

export const SITE_NAME = "Barcelona Gig Guide";

export const SITE_DESCRIPTION =
  "Discover live music, comedy, club nights, and festivals in Barcelona. Updated daily from Eventbrite and Ticketmaster.";

export const SITE_KEYWORDS = [
  "Barcelona gigs",
  "Barcelona concerts",
  "live music Barcelona",
  "comedy Barcelona",
  "club nights Barcelona",
  "Razzmatazz",
  "Sala Apolo",
  "Palau Sant Jordi",
  "Jamboree",
  "gig guide",
  "conciertos Barcelona",
];

export const OG_IMAGE_PATH = "/logo.png";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
