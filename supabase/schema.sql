-- Run this in the Supabase SQL editor (or via the Supabase CLI) to set up
-- the events table used by barcelona-gig-guide.

create table if not exists events (
  id text primary key, -- "{source}_{original_id}", e.g. "ticketmaster_12345"
  source text not null check (source in ('eventbrite', 'ticketmaster', 'opendata')),
  source_url text not null, -- link back to the original listing (required for attribution)
  title text not null,
  description text,
  venue_name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  price_min numeric,
  price_max numeric,
  is_free boolean not null default false,
  genre text check (genre in ('live-music', 'clubbing', 'festival', 'comedy', 'other')),
  image_url text,
  last_synced_at timestamptz not null default now()
);

-- Indexes to support the common filters: date window, genre, and venue/location search.
create index if not exists events_start_datetime_idx on events (start_datetime);
create index if not exists events_genre_idx on events (genre);
create index if not exists events_venue_name_idx on events (venue_name);

-- Row Level Security: the frontend reads with the public anon key, so only
-- allow SELECT. Writes (upserts from /api/sync) go through the service role
-- key in lib/supabase-admin.ts, which bypasses RLS entirely.
alter table events enable row level security;

drop policy if exists "Public read access" on events;
create policy "Public read access" on events
  for select
  using (true);
