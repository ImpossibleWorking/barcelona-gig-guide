const CANONICAL_PRODUCTION_URL = "https://barcelonagigguide.com";

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const looksLocal = !fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv);

  // Production (and any Vercel build that still has a leftover localhost URL)
  // must never emit localhost into sitemap, robots, or share links.
  if (process.env.VERCEL_ENV === "production" || (looksLocal && process.env.VERCEL)) {
    return CANONICAL_PRODUCTION_URL;
  }

  return fromEnv || CANONICAL_PRODUCTION_URL;
}

/** Canonical public URL for the site (custom domain in production). */
export const SITE_URL = resolveSiteUrl();

/** Google Analytics 4 measurement ID. Empty until a Barcelona property is configured. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
