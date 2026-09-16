"use client";

import { useEffect, useRef } from "react";

export default function EventVenueMap({
  latitude,
  longitude,
  venueName,
}: {
  latitude: number;
  longitude: number;
  venueName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function setup() {
      const L = (await import("leaflet")).default;
      if (cancelled || !container) return;

      map = L.map(container, { scrollWheelZoom: false, attributionControl: true }).setView(
        [latitude, longitude],
        15
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "gig-map-marker",
        html: '<span class="gig-map-marker-dot"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([latitude, longitude], { icon, title: venueName }).addTo(map);
    }

    void setup();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude, venueName]);

  return (
    <div
      ref={containerRef}
      className="h-56 w-full overflow-hidden rounded-xl border border-white/10 bg-surface-raised"
      aria-label={venueName}
    />
  );
}
