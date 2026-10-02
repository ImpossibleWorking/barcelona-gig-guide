"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { NormalizedEvent } from "@/lib/types";
import { useI18n } from "@/components/I18nProvider";
import FilterSidebar, { defaultFilters, hasActiveFilters, SortOption } from "./FilterSidebar";
import EventGrid from "./EventGrid";
import { toTimeZoneDateString } from "@/lib/datetime";
import { collapseRecurringSeries } from "@/lib/recurring";

function MapLoadingFallback() {
  const { t } = useI18n();
  return (
    <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-xl border border-white/10 bg-surface-raised text-sm text-zinc-400">
      {t("loadingMap")}
    </div>
  );
}

const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: MapLoadingFallback,
});

export type ViewMode = "grid" | "map";

// Receives events already fetched from Supabase for a fixed date window
// (see app/page.tsx) and does all filtering here, client-side, for instant
// feedback as the user adjusts filters.
export default function EventsExplorer({ events }: { events: NormalizedEvent[] }) {
  const { t } = useI18n();
  const [filters, setFilters] = useState(defaultFilters());
  const [sort, setSort] = useState<SortOption>("date");
  const [view, setView] = useState<ViewMode>("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      const eventDate = toTimeZoneDateString(event.start_datetime);
      if (filters.dateFrom && eventDate < filters.dateFrom) return false;
      if (filters.dateTo && eventDate > filters.dateTo) return false;

      if (filters.freeOnly && !event.is_free) return false;

      const price = event.price_min ?? event.price_max;
      if (price !== null && price !== undefined) {
        if (price < filters.priceMin || price > filters.priceMax) return false;
      }

      const genre = event.genre ?? "other";
      if (!filters.genres.has(genre)) return false;

      if (filters.search.trim()) {
        const query = filters.search.trim().toLowerCase();
        const haystack = `${event.title} ${event.description ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (filters.location.trim()) {
        const query = filters.location.trim().toLowerCase();
        const haystack = `${event.venue_name} ${event.address ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    const listed = collapseRecurringSeries(filtered);

    return listed.sort((a, b) => {
      if (sort === "date") {
        return a.start_datetime.localeCompare(b.start_datetime);
      }

      const priceA = a.price_min ?? a.price_max ?? Number.POSITIVE_INFINITY;
      const priceB = b.price_min ?? b.price_max ?? Number.POSITIVE_INFINITY;
      if (priceA !== priceB) return priceA - priceB;
      return a.start_datetime.localeCompare(b.start_datetime);
    });
  }, [events, filters, sort]);

  const eventCountKey = filteredEvents.length === 1 ? "eventCountOne" : "eventCountMany";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      <div className="lg:hidden">
        <button
          onClick={() => setSidebarOpen((open) => !open)}
          className="w-full rounded-lg border border-white/10 bg-surface-raised px-4 py-3 text-sm font-semibold text-white transition hover:border-accent/40 hover:text-accent"
        >
          {sidebarOpen ? t("hideFilters") : t("showFilters")}
        </button>
      </div>

      <div className={`${sidebarOpen ? "block" : "hidden"} lg:contents`}>
        <FilterSidebar filters={filters} onChange={setFilters} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-white">{t("upcomingGigs")}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-white/10 p-1">
              {(["grid", "map"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    view === mode
                      ? "bg-accent-muted text-accent"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t(mode)}
                </button>
              ))}
            </div>
            {view === "grid" && (
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {t("sort")}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="brand-input min-w-[10rem] py-2 text-sm normal-case tracking-normal text-white"
                >
                  <option value="date">{t("sortDate")}</option>
                  <option value="price">{t("sortPrice")}</option>
                </select>
              </label>
            )}
            <span className="rounded-full border border-accent/20 bg-accent-muted px-3 py-1 text-xs font-semibold text-accent">
              {t(eventCountKey, { count: filteredEvents.length })}
            </span>
          </div>
        </div>
        <div className={view === "grid" ? "block" : "hidden"}>
          <EventGrid
            events={filteredEvents}
            totalEvents={events.length}
            hasActiveFilters={hasActiveFilters(filters)}
          />
        </div>
        <div className={view === "map" ? "block" : "hidden"}>
          <EventMap
            events={filteredEvents}
            totalEvents={events.length}
            hasActiveFilters={hasActiveFilters(filters)}
            isVisible={view === "map"}
          />
        </div>
      </div>
    </div>
  );
}
