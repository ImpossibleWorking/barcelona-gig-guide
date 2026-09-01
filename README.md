# Barcelona Gig Guide

Lists live music, clubbing, comedy, and festival events in Barcelona, aggregated from Eventbrite and Ticketmaster.

Without API keys the site runs with sample listings so you can browse the UI immediately.

## Setup

1. **Supabase**: create a project, then run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor to create the `events` table.
2. **Env vars**: copy `.env.local.example` to `.env.local` and fill in:
   - `EVENTBRITE_API_KEY` — a private OAuth token from your Eventbrite account
   - `TICKETMASTER_API_KEY` — from [developer.ticketmaster.com](https://developer.ticketmaster.com/)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project's API settings
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, used server-only by `/api/sync`
   - `CRON_SECRET` — any random string; optional locally, recommended in production
3. **Eventbrite organizer IDs**: Eventbrite has no free-text location search, so `lib/sources/eventbrite.ts` queries a hardcoded list of Barcelona venues and promoters. Add more IDs there as you find them (`eventbrite.es/o/{slug}-{organizer_id}`).
4. Run `npm install` then `npm run dev`, and open [http://localhost:3000](http://localhost:3000).

## Syncing events

`GET /api/sync` fetches from Eventbrite and Ticketmaster, keeps only Barcelona-metro listings, dedupes overlapping shows, and upserts into Supabase. Trigger it manually while developing, or let [`vercel.json`](vercel.json) run it daily via Vercel Cron once deployed (Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to cron requests when `CRON_SECRET` is set as a project env var).

## Structure

- `lib/sources/eventbrite.ts`, `lib/sources/ticketmaster.ts` — fetch + normalize events from each API
- `lib/geo.ts` — Barcelona metro bounding box, neighbourhoods, and venue hints
- `app/api/sync/route.ts` — dedupes and upserts normalized events into Supabase
- `app/page.tsx` — server-fetches upcoming events for a 90-day window
- `components/EventsExplorer.tsx` — client-side filtering (date, price, genre, location) over that window
