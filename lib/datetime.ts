import { DATE_LOCALES, Locale } from "@/lib/i18n/config";

export const SITE_TIME_ZONE = "Europe/Madrid";

/** Calendar date in Barcelona local time, YYYY-MM-DD. */
export function toTimeZoneDateString(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });
}

/** 0 = Sunday … 6 = Saturday in Barcelona local time. */
export function toTimeZoneWeekday(iso: string | Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: SITE_TIME_ZONE,
  }).format(new Date(iso));

  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function zonedParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC ISO string.
 * Used by venue calendars that publish local dates without a timezone offset.
 */
export function zonedDateTimeToIso(
  year: number,
  month: number,
  day: number,
  hour = 20,
  minute = 0,
  second = 0,
  timeZone = SITE_TIME_ZONE
): string {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const actual = zonedParts(utcGuess, timeZone);
  const actualUtc = Date.UTC(
    actual.year,
    actual.month - 1,
    actual.day,
    actual.hour,
    actual.minute,
    actual.second
  );
  return new Date(utcGuess + (utcGuess - actualUtc)).toISOString();
}

/** True when the event is dated but the clock looks like a date-only midnight placeholder. */
export function isPlaceholderMidnight(iso: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SITE_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso))
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SITE_TIME_ZONE,
      minute: "2-digit",
    }).format(new Date(iso))
  );
  return hour === 0 && minute === 0;
}

export function formatEventDateTime(iso: string, locale: Locale = "en"): string {
  return new Date(iso).toLocaleString(DATE_LOCALES[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SITE_TIME_ZONE,
  });
}

export function isEventToday(iso: string): boolean {
  return toTimeZoneDateString(iso) === toTimeZoneDateString(new Date());
}

export type DatePreset = "tonight" | "weekend" | "week";

/** Add calendar days to a YYYY-MM-DD string without using the browser timezone. */
export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Tonight / weekend / week bounds in Europe/Madrid, not the visitor's clock. */
export function getDatePresetRange(
  preset: DatePreset,
  now: Date = new Date()
): { dateFrom: string; dateTo: string } {
  const today = toTimeZoneDateString(now);
  const weekday = toTimeZoneWeekday(now);

  if (preset === "tonight") {
    return { dateFrom: today, dateTo: today };
  }

  if (preset === "weekend") {
    if (weekday === 6) {
      return { dateFrom: today, dateTo: addCalendarDays(today, 1) };
    }
    if (weekday === 0) {
      return { dateFrom: addCalendarDays(today, -1), dateTo: today };
    }
    const saturday = addCalendarDays(today, 6 - weekday);
    return { dateFrom: saturday, dateTo: addCalendarDays(saturday, 1) };
  }

  const daysUntilSunday = weekday === 0 ? 0 : 7 - weekday;
  return { dateFrom: today, dateTo: addCalendarDays(today, daysUntilSunday) };
}
