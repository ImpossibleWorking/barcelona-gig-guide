/** ISR / CDN cache windows. Listings themselves refresh once a day via /api/sync. */

/** Homepage and event HTML — long enough to cut Fluid CPU, short enough to pick up the daily sync. */
export const PAGE_REVALIDATE_SECONDS = 60 * 60;

/** Generated OG images are expensive; event titles/venues rarely change intra-day. */
export const OG_IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24;

/** Calendar .ics downloads for a single listing. */
export const CALENDAR_REVALIDATE_SECONDS = 60 * 60 * 24;
