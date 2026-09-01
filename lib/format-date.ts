import { formatEventDateTime } from "@/lib/datetime";
import { Locale } from "@/lib/i18n/config";

export function formatLastUpdated(iso: string, locale: Locale = "en"): string {
  return formatEventDateTime(iso, locale);
}
