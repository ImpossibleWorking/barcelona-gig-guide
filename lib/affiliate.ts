import { NormalizedEvent } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

function readEnv(primary: string, fallback?: string): string | undefined {
  return process.env[primary] ?? (fallback ? process.env[fallback] : undefined);
}

function isUsableAffiliateBase(base: string | undefined): base is string {
  if (!base?.trim()) return false;
  return !/\b(YOUR_ID|AD_ID|CAMPAIGN_ID)\b/i.test(base);
}

function wrapWithAffiliateBase(url: string, base: string | undefined): string {
  if (!isUsableAffiliateBase(base)) return url;
  const trimmed = base.trim();
  if (trimmed.endsWith("=")) return `${trimmed}${encodeURIComponent(url)}`;
  const separator = trimmed.includes("?") ? "&u=" : "?u=";
  return `${trimmed}${separator}${encodeURIComponent(url)}`;
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
  switch (event.source) {
    case "ticketmaster":
      // Discovery API URLs are affiliate-wrapped automatically when your Impact
      // Publisher ID is linked in the Ticketmaster Developer Portal profile.
      return event.source_url;
    case "eventbrite":
      return wrapWithAffiliateBase(
        event.source_url,
        readEnv("EVENTBRITE_AFFILIATE_BASE", "NEXT_PUBLIC_EVENTBRITE_AFFILIATE_BASE")
      );
    default:
      return event.source_url;
  }
}
