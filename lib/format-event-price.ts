import { DATE_LOCALES, Locale } from "@/lib/i18n/config";
import { Messages } from "@/lib/i18n/messages";
import { NormalizedEvent } from "@/lib/types";

/** Max is likely VIP/hospitality when it is at least this many times the cheapest ticket. */
const FROM_PRICE_RATIO = 3;

function formatEuro(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(DATE_LOCALES[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function shouldShowFromPrice(min: number, max: number): boolean {
  if (min <= 0) return max > min;
  return max >= min * FROM_PRICE_RATIO;
}

/** True when we have a numeric price to show (not Ticketmaster's usual "see site" case). */
export function hasDisplayPrice(event: NormalizedEvent): boolean {
  return event.price_min != null || event.price_max != null;
}

export function formatEventPrice(
  event: NormalizedEvent,
  locale: Locale = "en",
  t?: (key: keyof Messages, vars?: Record<string, string | number>) => string
): string {
  const label = (key: keyof Messages, fallback: string, vars?: Record<string, string | number>) =>
    t ? t(key, vars) : fallback;

  if (event.is_free) return label("free", "Free");
  if (event.price_min != null) {
    if (event.price_max != null && event.price_max !== event.price_min) {
      const minLabel = formatEuro(event.price_min, locale);
      if (shouldShowFromPrice(event.price_min, event.price_max)) {
        return label("fromPrice", `From ${minLabel}`, { price: minLabel });
      }
      return `${minLabel}–${formatEuro(event.price_max, locale)}`;
    }
    return formatEuro(event.price_min, locale);
  }
  if (event.price_max != null) return formatEuro(event.price_max, locale);

  if (event.source === "ticketmaster") return label("seeTickets", "See tickets");

  return label("priceTbc", "Price TBC");
}
