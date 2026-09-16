import { toTimeZoneDateString } from "@/lib/datetime";
import { collapseRecurringSeries } from "@/lib/recurring";
import { ListedEvent, NormalizedEvent } from "@/lib/types";

function venueKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getRelatedListings(
  event: NormalizedEvent,
  upcoming: NormalizedEvent[],
  limit = 4
): { sameVenue: ListedEvent[]; sameNight: ListedEvent[] } {
  const listed = collapseRecurringSeries(upcoming);
  const day = toTimeZoneDateString(event.start_datetime);
  const venue = venueKey(event.venue_name);

  const sameVenue = listed
    .filter((candidate) => candidate.id !== event.id && venueKey(candidate.venue_name) === venue)
    .slice(0, limit);

  const sameNight = listed
    .filter(
      (candidate) =>
        candidate.id !== event.id &&
        toTimeZoneDateString(candidate.start_datetime) === day &&
        venueKey(candidate.venue_name) !== venue
    )
    .slice(0, limit);

  return { sameVenue, sameNight };
}
