import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import EventsExplorer from "@/components/EventsExplorer";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getLastSyncedAt, getUpcomingEvents, isDemoDataEnabled } from "@/lib/events";
import { getLocale, getMessages } from "@/lib/i18n/get-locale";
import { interpolate } from "@/lib/i18n/messages";
import { SITE_NAME, absoluteUrl, OG_IMAGE_PATH } from "@/lib/seo";
import { buildHomeStructuredData } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const events = await getUpcomingEvents();
  const count = events.length;
  const copy = getMessages(getLocale());
  const title =
    count > 0
      ? interpolate(copy.metaHomeTitle, { count })
      : copy.metaHomeTitleEmpty;
  const description =
    count > 0
      ? interpolate(copy.metaHomeDescription, { count })
      : copy.tagline;

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: SITE_URL,
      images: [{ url: absoluteUrl(OG_IMAGE_PATH), alt: SITE_NAME }],
    },
    twitter: {
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [absoluteUrl(OG_IMAGE_PATH)],
    },
  };
}

export default async function HomePage() {
  const events = await getUpcomingEvents();
  const lastSyncedAt = getLastSyncedAt(events);
  const locale = getLocale();
  const copy = getMessages(locale);

  return (
    <>
      <StructuredData data={buildHomeStructuredData(events, locale, copy)} />
      <main className="flex min-h-screen flex-col bg-brand-gradient">
        <SiteHeader eventCount={events.length} isDemo={isDemoDataEnabled()} />
        <EventsExplorer events={events} />
        <SiteFooter lastSyncedAt={lastSyncedAt} />
      </main>
    </>
  );
}
