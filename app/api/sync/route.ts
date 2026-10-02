import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchEventbriteEvents } from "@/lib/sources/eventbrite";
import { fetchOpenDataEvents } from "@/lib/sources/opendata";
import { fetchTicketmasterEvents } from "@/lib/sources/ticketmaster";
import { isGigRelevantEvent, normalizeForGigGuide } from "@/lib/gig-relevance";
import { dedupeEvents } from "@/lib/dedupe";
import { NormalizedEvent, EventSource } from "@/lib/types";

export const dynamic = "force-dynamic"; // never statically cache a route that writes data
export const maxDuration = 60; // seconds — source APIs + upsert can take a while

const UPSERT_BATCH_SIZE = 200;

async function upsertEvents(events: NormalizedEvent[]): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin();
  let upserted = 0;

  for (let i = 0; i < events.length; i += UPSERT_BATCH_SIZE) {
    const batch = events.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabaseAdmin.from("events").upsert(batch, { onConflict: "id" });

    if (error) {
      console.error("Supabase upsert error:", error);
      throw new Error(`Failed to upsert batch starting at index ${i}: ${error.message}`);
    }

    upserted += batch.length;
  }

  return upserted;
}

async function deletePastEvents(): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("events")
    .delete()
    .lt("start_datetime", now)
    .select("id");

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(`Failed to delete past events: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function deleteDelistedEvents(
  syncedAt: string,
  sourcesToClean: EventSource[]
): Promise<number> {
  if (sourcesToClean.length === 0) return 0;

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("events")
    .delete()
    .gte("start_datetime", now)
    .lt("last_synced_at", syncedAt)
    .in("source", sourcesToClean)
    .select("id");

  if (error) {
    console.error("Supabase delisted delete error:", error);
    throw new Error(`Failed to delete delisted events: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function deleteNonGigEvents(): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .gte("start_datetime", now);

  if (error) {
    console.error("Supabase non-gig fetch error:", error);
    throw new Error(`Failed to fetch events for non-gig cleanup: ${error.message}`);
  }

  const idsToDelete = (data ?? [])
    .filter((event) => !isGigRelevantEvent(event as NormalizedEvent))
    .map((event) => event.id);

  if (idsToDelete.length === 0) return 0;

  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from("events")
    .delete()
    .in("id", idsToDelete)
    .select("id");

  if (deleteError) {
    console.error("Supabase non-gig delete error:", deleteError);
    throw new Error(`Failed to delete non-gig events: ${deleteError.message}`);
  }

  return deleted?.length ?? 0;
}

function isAuthorized(request: NextRequest): boolean {
  // If CRON_SECRET isn't configured, don't lock out local development.
  if (!process.env.CRON_SECRET) return true;
  return request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Triggered daily by Vercel Cron (see vercel.json) and safe to call manually
// for a one-off refresh. GET rather than POST because that's what Vercel
// Cron sends.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const syncedAt = new Date().toISOString();
    const sourcesToClean: EventSource[] = [];

    let eventbriteEvents: NormalizedEvent[] = [];
    let ticketmasterEvents: NormalizedEvent[] = [];
    let openDataEvents: NormalizedEvent[] = [];

    const [eventbriteResult, ticketmasterResult, openDataResult] = await Promise.all([
      process.env.EVENTBRITE_API_KEY
        ? fetchEventbriteEvents()
            .then((events) => ({ events, error: null as unknown }))
            .catch((error) => {
              console.error("Eventbrite fetch failed:", error);
              return { events: [] as NormalizedEvent[], error };
            })
        : Promise.resolve({ events: [] as NormalizedEvent[], error: "skip" as unknown }),
      process.env.TICKETMASTER_API_KEY
        ? fetchTicketmasterEvents()
            .then((events) => ({ events, error: null as unknown }))
            .catch((error) => {
              console.error("Ticketmaster fetch failed:", error);
              return { events: [] as NormalizedEvent[], error };
            })
        : Promise.resolve({ events: [] as NormalizedEvent[], error: "skip" as unknown }),
      fetchOpenDataEvents()
        .then((events) => ({ events, error: null as unknown }))
        .catch((error) => {
          console.error("Open Data BCN fetch failed:", error);
          return { events: [] as NormalizedEvent[], error };
        }),
    ]);

    eventbriteEvents = eventbriteResult.events;
    ticketmasterEvents = ticketmasterResult.events;
    openDataEvents = openDataResult.events;

    if (process.env.EVENTBRITE_API_KEY && eventbriteResult.error == null) {
      sourcesToClean.push("eventbrite");
    }
    if (process.env.TICKETMASTER_API_KEY && ticketmasterResult.error == null) {
      sourcesToClean.push("ticketmaster");
    }
    if (openDataResult.error == null) {
      sourcesToClean.push("opendata");
    }

    const combined = [...eventbriteEvents, ...ticketmasterEvents, ...openDataEvents];
    const gigEvents = combined
      .map((event) => normalizeForGigGuide(event))
      .filter((event): event is NormalizedEvent => event !== null);
    const deduped = dedupeEvents(gigEvents).map((event) => ({ ...event, last_synced_at: syncedAt }));
    const ticketed = deduped.filter((event) => event.source !== "opendata");
    const civic = deduped.filter((event) => event.source === "opendata");
    const upsertedTicketed = await upsertEvents(ticketed);

    let upsertedCivic = 0;
    if (civic.length > 0) {
      try {
        upsertedCivic = await upsertEvents(civic);
      } catch (error) {
        console.error("Open Data BCN upsert failed (run supabase/migrations/005_add_opendata_source.sql):", error);
        const opendataIndex = sourcesToClean.indexOf("opendata");
        if (opendataIndex >= 0) sourcesToClean.splice(opendataIndex, 1);
      }
    }

    const upserted = upsertedTicketed + upsertedCivic;
    const deletedPast = await deletePastEvents();
    const deletedDelisted = await deleteDelistedEvents(syncedAt, sourcesToClean);
    const deletedNonGig = await deleteNonGigEvents();

    return NextResponse.json({
      ok: true,
      fetched: {
        eventbrite: eventbriteEvents.length,
        ticketmaster: ticketmasterEvents.length,
        opendata: openDataEvents.length,
      },
      deduped: deduped.length,
      upserted,
      deletedPast,
      deletedDelisted,
      deletedNonGig,
      syncedAt,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
