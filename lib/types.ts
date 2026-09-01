// Shared types for the normalized event schema used across source fetchers,
// the sync route, and the frontend.

export type EventSource = "eventbrite" | "ticketmaster";

// Fixed genre set that both source fetchers normalize into.
export type EventGenre = "live-music" | "clubbing" | "festival" | "comedy" | "other";

export interface NormalizedEvent {
  id: string; // "{source}_{original_id}"
  source: EventSource;
  source_url: string;
  title: string;
  description: string | null;
  venue_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_datetime: string; // ISO 8601
  end_datetime: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean;
  genre: EventGenre | null;
  image_url: string | null;
  last_synced_at: string; // ISO 8601
}
