/** Canonical public URL for the site (custom domain in production). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://barcelonagigguide.com";

/** Google Analytics 4 measurement ID. Empty until a Barcelona property is configured. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
