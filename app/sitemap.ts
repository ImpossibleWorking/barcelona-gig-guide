import type { MetadataRoute } from "next";
import { getUpcomingEvents } from "@/lib/events";
import { getEventUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getUpcomingEvents();

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: getEventUrl(event.id),
    lastModified: event.last_synced_at,
    changeFrequency: "daily",
    priority: event.source === "opendata" ? 0.5 : 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...eventEntries,
  ];
}
