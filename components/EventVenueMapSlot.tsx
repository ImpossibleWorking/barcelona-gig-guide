"use client";

import dynamic from "next/dynamic";

const EventVenueMap = dynamic(() => import("./EventVenueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-xl border border-white/10 bg-surface-raised" />
  ),
});

export default function EventVenueMapSlot({
  latitude,
  longitude,
  venueName,
}: {
  latitude: number;
  longitude: number;
  venueName: string;
}) {
  return <EventVenueMap latitude={latitude} longitude={longitude} venueName={venueName} />;
}
