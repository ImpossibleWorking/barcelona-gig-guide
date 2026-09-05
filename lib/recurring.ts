import { canonicalEventTitle, normalizeForDedup } from "@/lib/dedupe";
import { toTimeZoneWeekday } from "@/lib/datetime";
import { ListedEvent, NormalizedEvent, SeriesKind } from "@/lib/types";

function seriesKey(event: NormalizedEvent): string {
  return `${canonicalEventTitle(event.title)}|${normalizeForDedup(event.venue_name)}`;
}

function seriesKindForGroup(events: NormalizedEvent[]): SeriesKind | undefined {
  if (events.length < 2) return undefined;

  const weekdays = new Set(events.map((event) => toTimeZoneWeekday(event.start_datetime)));
  if (weekdays.size >= 6) return "every-night";
  if (weekdays.size === 1) return "weekly";
  return "several";
}

/**
 * Collapse the same billed show at the same venue to the soonest date.
 * Run this after date filters so Tonight / Weekend still see the matching night.
 */
export function collapseRecurringSeries(events: NormalizedEvent[]): ListedEvent[] {
  const groups = new Map<string, NormalizedEvent[]>();

  for (const event of events) {
    const key = seriesKey(event);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  const listed: ListedEvent[] = [];

  for (const group of Array.from(groups.values())) {
    group.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
    const next = group[0];
    const seriesKind = seriesKindForGroup(group);
    listed.push(seriesKind ? { ...next, seriesKind } : next);
  }

  return listed;
}
