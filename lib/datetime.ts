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
