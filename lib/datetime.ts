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
