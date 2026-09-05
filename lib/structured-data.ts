import { getOutboundUrl } from "@/lib/affiliate";
import { HTML_LANG, Locale } from "@/lib/i18n/config";
import { Messages } from "@/lib/i18n/messages";
import { NormalizedEvent } from "@/lib/types";
import { SITE_NAME, getEventUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const MAX_LISTED_EVENTS = 24;

function eventSchemaType(genre: NormalizedEvent["genre"]): string {
  switch (genre) {
    case "comedy":
      return "ComedyEvent";
    case "festival":
      return "Festival";
    default:
      return "MusicEvent";
  }
}

function buildEventSchema(event: NormalizedEvent) {
  const schema: Record<string, unknown> = {
    "@type": eventSchemaType(event.genre),
    name: event.title,
    startDate: event.start_datetime,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venue_name,
      ...(event.address ? { address: event.address } : {}),
      ...(event.latitude != null && event.longitude != null
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: event.latitude,
              longitude: event.longitude,
            },
          }
        : {}),
    },
    url: getEventUrl(event.id),
  };

  if (event.end_datetime) schema.endDate = event.end_datetime;
  if (event.image_url) schema.image = event.image_url;

  if (event.is_free) {
    schema.offers = {
      "@type": "Offer",
      url: getOutboundUrl(event.id),
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    };
  } else if (event.price_min != null) {
    schema.offers = {
      "@type": "Offer",
      url: getOutboundUrl(event.id),
      price: event.price_min,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    };
  } else {
    schema.offers = {
      "@type": "Offer",
      url: getOutboundUrl(event.id),
      availability: "https://schema.org/InStock",
    };
  }

  return schema;
}

export function buildEventPageStructuredData(event: NormalizedEvent) {
  return {
    "@context": "https://schema.org",
    ...buildEventSchema(event),
  };
}

export function buildHomeStructuredData(
  events: NormalizedEvent[],
  locale: Locale,
  copy: Messages
) {
  const listedEvents = events.slice(0, MAX_LISTED_EVENTS);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: copy.tagline,
        inLanguage: HTML_LANG[locale],
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: SITE_NAME,
        description: copy.tagline,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: {
          "@type": "Place",
          name: "Barcelona",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Barcelona",
            addressRegion: "Catalonia",
            addressCountry: "ES",
          },
        },
      },
      ...(listedEvents.length > 0
        ? [
            {
              "@type": "ItemList",
              "@id": `${SITE_URL}/#events`,
              name: copy.upcomingGigs,
              numberOfItems: events.length,
              itemListElement: listedEvents.map((event, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: buildEventSchema(event),
              })),
            },
          ]
        : []),
    ],
  };
}
