-- Drop the UK-only Skiddle source from a table created by an older schema.

alter table events drop constraint if exists events_source_check;
alter table events add constraint events_source_check
  check (source in ('eventbrite', 'ticketmaster'));
