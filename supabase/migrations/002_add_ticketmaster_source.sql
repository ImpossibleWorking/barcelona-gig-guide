-- Run this in the Supabase SQL editor against your EXISTING database to
-- allow 'ticketmaster' as a source value (schema.sql already has this baked
-- in for fresh installs — this is only needed to update a table created
-- before Ticketmaster was added).

alter table events drop constraint if exists events_source_check;
alter table events add constraint events_source_check
  check (source in ('skiddle', 'eventbrite', 'ticketmaster'));
