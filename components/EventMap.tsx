"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { getOutboundPath } from "@/lib/affiliate";
import { formatEventPrice } from "@/lib/format-event-price";
import { formatListedEventDate } from "@/lib/format-listed-event";
import { MAP_CENTER } from "@/lib/geo";
import { Locale } from "@/lib/i18n/config";
import { Messages } from "@/lib/i18n/messages";
import { ListedEvent } from "@/lib/types";

function hasCoordinates(
  event: ListedEvent
): event is ListedEvent & { latitude: number; longitude: number } {
  return event.latitude != null && event.longitude != null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPopupHtml(
  event: ListedEvent,
  locale: Locale,
  t: (key: keyof Messages, vars?: Record<string, string | number>) => string
): string {
  const href = escapeHtml(getOutboundPath(event.id));
  const title = escapeHtml(event.title);
  const venue = escapeHtml(event.venue_name);
  const date = escapeHtml(formatListedEventDate(event, locale, t));
  const price = escapeHtml(formatEventPrice(event, locale, t));
  const listing = escapeHtml(t("viewListing"));

  return `
    <div class="gig-map-popup">
      <p class="gig-map-popup-title">${title}</p>
      <p class="gig-map-popup-meta">${venue}</p>
      <p class="gig-map-popup-meta">${date} · ${price}</p>
      <a class="gig-map-popup-link" href="${href}" target="_blank" rel="noopener noreferrer">${listing}</a>
    </div>
  `;
}

function MapEmptyState({
  totalEvents,
  hasActiveFilters,
}: {
  totalEvents: number;
  hasActiveFilters: boolean;
}) {
  const { t } = useI18n();

  if (totalEvents === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface-raised/50 py-20 text-center">
        <p className="font-display text-xl text-white">{t("emptyTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-zinc-400">{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface-raised/50 py-20 text-center">
      <p className="font-display text-xl text-white">{t("noMatchTitle")}</p>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        {hasActiveFilters ? t("noMatchActive") : t("noMatchInactive")}
      </p>
    </div>
  );
}

export default function EventMap({
  events,
  totalEvents,
  hasActiveFilters,
  isVisible,
}: {
  events: ListedEvent[];
  totalEvents: number;
  hasActiveFilters: boolean;
  isVisible: boolean;
}) {
  const { t, locale } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mappableEvents = useMemo(() => events.filter(hasCoordinates), [events]);
  const hiddenCount = events.length - mappableEvents.length;
  const eventKey = useMemo(() => mappableEvents.map((event) => event.id).join("|"), [mappableEvents]);

  useEffect(() => {
    if (!isVisible || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(MAP_CENTER, 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      setMapReady(false);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const icon = L.divIcon({
      className: "gig-map-marker",
      html: '<span class="gig-map-marker-dot"></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    for (const event of mappableEvents) {
      L.marker([event.latitude, event.longitude], { icon })
        .bindPopup(buildPopupHtml(event, locale, t))
        .addTo(markersLayerRef.current);
    }

    const map = mapRef.current;
    if (mappableEvents.length === 1) {
      map.setView([mappableEvents[0].latitude, mappableEvents[0].longitude], 14);
    } else if (mappableEvents.length > 1) {
      const bounds = L.latLngBounds(
        mappableEvents.map((event) => [event.latitude, event.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    } else {
      map.setView(MAP_CENTER, 12);
    }
  }, [mapReady, eventKey, mappableEvents, locale, t]);

  useEffect(() => {
    if (!isVisible || !mapReady || !mapRef.current) return;

    const map = mapRef.current;
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => cancelAnimationFrame(frame);
  }, [isVisible, mapReady, eventKey]);

  if (events.length === 0) {
    return <MapEmptyState totalEvents={totalEvents} hasActiveFilters={hasActiveFilters} />;
  }

  if (mappableEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface-raised/50 py-20 text-center">
        <p className="font-display text-xl text-white">{t("noMappableTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          {t("noMappableBody", { count: events.length })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hiddenCount > 0 && (
        <p className="text-xs text-zinc-500">
          {t("mapHiddenCount", { shown: mappableEvents.length, total: events.length })}
        </p>
      )}
      <div
        ref={containerRef}
        className="h-[min(70vh,640px)] w-full overflow-hidden rounded-xl border border-white/10 bg-surface-raised"
        aria-label={t("mapAria")}
      />
    </div>
  );
}
