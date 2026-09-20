import { NormalizedEvent } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

function readEnv(primary: string, fallback?: string): string | undefined {
  return process.env[primary] ?? (fallback ? process.env[fallback] : undefined);
}

function isUsableAffiliateBase(base: string | undefined): boolean {
  if (!base?.trim()) return false;
  return !/\b(YOUR_ID|AD_ID|CAMPAIGN_ID)\b/i.test(base);
}

function isAlreadyAffiliateWrapped(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith(".pxf.io") ||
      host.endsWith(".evyy.net") ||
      host.includes("impactradius") ||
      host.includes("impact.com")
    );
  } catch {
    return false;
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** True when /go/[id] can wrap this listing with Impact (Eventbrite, Ticketmaster, or Fever). */
export function hasAffiliateCheckout(event: Pick<NormalizedEvent, "source" | "source_url">): boolean {
  if (event.source === "eventbrite" || event.source === "ticketmaster") return true;
  const host = hostnameOf(event.source_url);
  if (!host) return false;
  return (
    host.includes("eventbrite.") ||
    host.includes("ticketmaster.") ||
    host === "feverup.com" ||
    host.endsWith(".feverup.com")
  );
}

function wrapWithAffiliateBase(url: string, base: string | undefined): string {
  if (!isUsableAffiliateBase(base) || isAlreadyAffiliateWrapped(url) || !base) return url;
  const trimmed = base.trim();
  if (trimmed.endsWith("=")) return `${trimmed}${encodeURIComponent(url)}`;
  const separator = trimmed.includes("?") ? "&u=" : "?u=";
  return `${trimmed}${separator}${encodeURIComponent(url)}`;
}

/**
 * Affiliate is keyed off the checkout host, not the listing source.
 * Venue calendars often deep-link Eventbrite / Ticketmaster / Fever even when
 * `event.source === "venue"`. Onebox, Entradium, Dice, and venue-owned pages
 * have no public cookie-affiliate programme we can wrap.
 */
function affiliateBaseForDestination(url: string): string | undefined {
  const host = hostnameOf(url);
  if (!host) return undefined;

  if (host.includes("eventbrite.")) {
    return readEnv("EVENTBRITE_AFFILIATE_BASE", "NEXT_PUBLIC_EVENTBRITE_AFFILIATE_BASE");
  }
  if (host.includes("ticketmaster.")) {
    return readEnv("TICKETMASTER_AFFILIATE_BASE", "NEXT_PUBLIC_TICKETMASTER_AFFILIATE_BASE");
  }
  if (host === "feverup.com" || host.endsWith(".feverup.com")) {
    return readEnv("FEVER_AFFILIATE_BASE", "NEXT_PUBLIC_FEVER_AFFILIATE_BASE");
  }
  return undefined;
}

function affiliateBaseForSource(source: NormalizedEvent["source"]): string | undefined {
  switch (source) {
    case "ticketmaster":
      return readEnv("TICKETMASTER_AFFILIATE_BASE", "NEXT_PUBLIC_TICKETMASTER_AFFILIATE_BASE");
    case "eventbrite":
      return readEnv("EVENTBRITE_AFFILIATE_BASE", "NEXT_PUBLIC_EVENTBRITE_AFFILIATE_BASE");
    default:
      return undefined;
  }
}

/** On-site redirect path — affiliate params are applied in /go/[id]. */
export function getOutboundPath(eventId: string): string {
  return `/go/${encodeURIComponent(eventId)}`;
}

export function getOutboundUrl(eventId: string, siteUrl = SITE_URL): string {
  return `${siteUrl.replace(/\/$/, "")}${getOutboundPath(eventId)}`;
}

/**
 * Builds the outbound ticket/listing URL with affiliate tracking where configured.
 * Used by /go/[id] at redirect time so secrets stay server-side.
 */
export function buildAffiliateUrl(event: NormalizedEvent): string {
  const base = affiliateBaseForDestination(event.source_url) ?? affiliateBaseForSource(event.source);
  return wrapWithAffiliateBase(event.source_url, base);
}
