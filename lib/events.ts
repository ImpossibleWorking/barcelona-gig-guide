import { cache } from "react";
import { dedupeEvents } from "@/lib/dedupe";
import { findDemoEvent, getDemoEvents } from "@/lib/demo-events";
import { isGigRelevantEvent } from "@/lib/gig-relevance";
import { getSupabase } from "@/lib/supabase";
import { NormalizedEvent } from "@/lib/types";

export const EVENTS_DAYS_AHEAD = 90;

export function isDemoDataEnabled(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Cached server fetch — shared by the homepage and generateMetadata. */
export const getUpcomingEvents = cache(async (): Promise<NormalizedEvent[]> => {
  if (isDemoDataEnabled()) {
    return getDemoEvents();
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + EVENTS_DAYS_AHEAD * 24 * 60 * 60 * 1000);

  try {
    const { data, error } = await getSupabase()
      .from("events")
      .select("*")
      .gte("start_datetime", now.toISOString())
      .lte("start_datetime", windowEnd.toISOString())
      .order("start_datetime", { ascending: true });

    if (error) {
      console.error("Failed to load events:", error);
      return [];
    }

    return dedupeEvents(
      (data ?? []).filter((event) => isGigRelevantEvent(event as NormalizedEvent))
    );
  } catch (error) {
    console.error("Failed to load events:", error);
    return [];
  }
});

/** Single listing for event pages and /go fallbacks. */
export const getEventById = cache(async (id: string): Promise<NormalizedEvent | null> => {
  if (isDemoDataEnabled()) {
    return findDemoEvent(id);
  }

  try {
    const { data, error } = await getSupabase().from("events").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("Failed to load event:", error);
      return null;
    }
    return data ? (data as NormalizedEvent) : null;
  } catch (error) {
    console.error("Failed to load event:", error);
    return null;
  }
});

/** Latest sync timestamp across all loaded events (from last_synced_at). */
export function getLastSyncedAt(events: NormalizedEvent[]): string | null {
  if (events.length === 0) return null;

  return events.reduce(
    (latest, event) => (event.last_synced_at > latest ? event.last_synced_at : latest),
    events[0].last_synced_at
  );
}
