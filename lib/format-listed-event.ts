import { DATE_LOCALES, Locale } from "@/lib/i18n/config";
import { Messages } from "@/lib/i18n/messages";
import { SITE_TIME_ZONE, formatEventDateTime } from "@/lib/datetime";
import { ListedEvent } from "@/lib/types";

export function formatListedEventDate(
  event: ListedEvent,
  locale: Locale,
  t: (key: keyof Messages, vars?: Record<string, string | number>) => string
): string {
  const date = formatEventDateTime(event.start_datetime, locale);

  if (event.seriesKind === "every-night") {
    return t("seriesEveryNightNext", { date });
  }

  if (event.seriesKind === "weekly") {
    const weekday = new Date(event.start_datetime).toLocaleDateString(DATE_LOCALES[locale], {
      weekday: "long",
      timeZone: SITE_TIME_ZONE,
    });
    return t("seriesWeeklyNext", { weekday, date });
  }

  if (event.seriesKind === "several") {
    return t("seriesSeveralNext", { date });
  }

  return date;
}