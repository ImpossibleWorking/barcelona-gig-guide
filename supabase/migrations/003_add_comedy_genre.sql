-- Run this in the Supabase SQL editor against your EXISTING database to
-- allow 'comedy' as a genre value (schema.sql already has this baked in
-- for fresh installs — this is only needed to update a table created before
-- comedy was added).

alter table events drop constraint if exists events_genre_check;
alter table events add constraint events_genre_check
  check (genre in ('live-music', 'clubbing', 'festival', 'comedy', 'other'));
