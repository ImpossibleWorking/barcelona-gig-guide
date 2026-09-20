-- Official venue calendars (Sala Apolo, Jamboree, etc.).

alter table events drop constraint if exists events_source_check;
alter table events add constraint events_source_check
  check (source in ('eventbrite', 'ticketmaster', 'opendata', 'venue'));
