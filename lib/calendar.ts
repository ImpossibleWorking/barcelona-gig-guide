import { getEventUrl } from "@/lib/seo";
import { NormalizedEvent } from "@/lib/types";

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function defaultEndIso(startIso: string): string {
  return new Date(new Date(startIso).getTime() + 2 * 60 * 60 * 1000).toISOString();
}

export function getCalendarPath(eventId: string): string {
  return `/e/${encodeURIComponent(eventId)}/calendar`;
}

export function buildEventIcs(event: NormalizedEvent): string {
  const location = [event.venue_name, event.address].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barcelona Gig Guide//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@barcelonagigguide.com`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(event.start_datetime)}`,
    `DTEND:${toIcsUtc(event.end_datetime ?? defaultEndIso(event.start_datetime))}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(event.description ?? "")}`,
    `URL:${getEventUrl(event.id)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}
