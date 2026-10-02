"use client";

import { useLayoutEffect, useRef } from "react";
import { EventGenre } from "@/lib/types";
import { useI18n } from "@/components/I18nProvider";
import { DatePreset, getDatePresetRange } from "@/lib/datetime";
import { Messages } from "@/lib/i18n/messages";

export interface Filters {
  search: string;
  dateFrom: string; // YYYY-MM-DD, "" = no lower bound
  dateTo: string; // YYYY-MM-DD, "" = no upper bound
  priceMin: number;
  priceMax: number;
  genres: Set<EventGenre>;
  location: string;
  freeOnly: boolean;
}

export type SortOption = "date" | "price";

export const PRICE_CEILING = 200;

const GENRE_KEYS: EventGenre[] = ["live-music", "clubbing", "festival", "comedy", "other"];

export function defaultFilters(): Filters {
  return {
    search: "",
    dateFrom: "",
    dateTo: "",
    priceMin: 0,
    priceMax: PRICE_CEILING,
    genres: new Set<EventGenre>(GENRE_KEYS),
    location: "",
    freeOnly: false,
  };
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.freeOnly ||
    filters.location.trim() !== "" ||
    filters.priceMin > 0 ||
    filters.priceMax < PRICE_CEILING ||
    filters.genres.size < GENRE_KEYS.length
  );
}

const DATE_PRESETS: { id: DatePreset }[] = [
  { id: "tonight" },
  { id: "weekend" },
  { id: "week" },
];

function activeDatePreset(filters: Filters): DatePreset | null {
  for (const { id } of DATE_PRESETS) {
    const range = getDatePresetRange(id);
    if (filters.dateFrom === range.dateFrom && filters.dateTo === range.dateTo) {
      return id;
    }
  }
  return null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
      {children}
    </h2>
  );
}

/** Keep the sticky sidebar inside the visible viewport so it can scroll. */
function useFitSidebarToViewport() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const desktop = window.matchMedia("(min-width: 1024px)");

    const fit = () => {
      if (!desktop.matches) {
        el.style.maxHeight = "";
        return;
      }

      const top = el.getBoundingClientRect().top;
      const bottomGap = 16;
      el.style.maxHeight = `${Math.max(240, Math.floor(window.innerHeight - top - bottomGap))}px`;
    };

    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    desktop.addEventListener("change", fit);

    return () => {
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      desktop.removeEventListener("change", fit);
    };
  }, []);

  return ref;
}

export default function FilterSidebar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const { t } = useI18n();
  const sidebarRef = useFitSidebarToViewport();
  const genreLabels: Record<EventGenre, string> = {
    "live-music": t("liveMusic"),
    clubbing: t("clubbing"),
    festival: t("festival"),
    comedy: t("comedy"),
    other: t("other"),
  };
  const datePresetLabels: Record<DatePreset, keyof Messages> = {
    tonight: "tonight",
    weekend: "weekend",
    week: "week",
  };

  const toggleGenre = (genre: EventGenre) => {
    const nextGenres = new Set(filters.genres);
    if (nextGenres.has(genre)) {
      nextGenres.delete(genre);
    } else {
      nextGenres.add(genre);
    }
    onChange({ ...filters, genres: nextGenres });
  };

  return (
    <aside
      ref={sidebarRef}
      className="filter-scroll brand-panel space-y-6 overflow-y-auto overscroll-y-contain p-5 lg:sticky lg:top-6 lg:w-72 lg:flex-shrink-0 lg:self-start lg:max-h-[calc(100dvh-3rem)]"
    >
      <div>
        <SectionLabel>{t("search")}</SectionLabel>
        <input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="brand-input mt-3"
        />
      </div>

      <div>
        <SectionLabel>{t("dateRange")}</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {DATE_PRESETS.map(({ id }) => {
            const active = activeDatePreset(filters) === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (active) {
                    onChange({ ...filters, dateFrom: "", dateTo: "" });
                    return;
                  }
                  onChange({ ...filters, ...getDatePresetRange(id) });
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-white/10 text-zinc-400 hover:border-accent/40 hover:text-accent"
                }`}
              >
                {t(datePresetLabels[id])}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <label className="text-xs text-zinc-400">
            {t("dateFrom")}
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="brand-input [color-scheme:dark]"
            />
          </label>
          <label className="text-xs text-zinc-400">
            {t("dateTo")}
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="brand-input [color-scheme:dark]"
            />
          </label>
        </div>
      </div>

      <div>
        <SectionLabel>{t("priceRange")}</SectionLabel>
        <p className="mt-2 text-sm font-medium text-white">
          €{filters.priceMin} – €{filters.priceMax}
          {filters.priceMax >= PRICE_CEILING ? "+" : ""}
        </p>
        <div className="mt-3 space-y-2">
          <input
            type="range"
            aria-label={t("minPrice")}
            min={0}
            max={PRICE_CEILING}
            value={filters.priceMin}
            onChange={(e) => {
              const value = Math.min(Number(e.target.value), filters.priceMax);
              onChange({ ...filters, priceMin: value });
            }}
            className="w-full accent-accent"
          />
          <input
            type="range"
            aria-label={t("maxPrice")}
            min={0}
            max={PRICE_CEILING}
            value={filters.priceMax}
            onChange={(e) => {
              const value = Math.max(Number(e.target.value), filters.priceMin);
              onChange({ ...filters, priceMax: value });
            }}
            className="w-full accent-accent"
          />
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={filters.freeOnly}
            onChange={(e) => onChange({ ...filters, freeOnly: e.target.checked })}
            className="rounded border-white/20 bg-white/5 accent-accent"
          />
          {t("freeOnly")}
        </label>
      </div>

      <div>
        <SectionLabel>{t("genre")}</SectionLabel>
        <div className="mt-3 space-y-2.5">
          {GENRE_KEYS.map((genre) => (
            <label key={genre} className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={filters.genres.has(genre)}
                onChange={() => toggleGenre(genre)}
                className="rounded border-white/20 bg-white/5 accent-accent"
              />
              {genreLabels[genre]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>{t("venueOrArea")}</SectionLabel>
        <input
          type="text"
          placeholder={t("venuePlaceholder")}
          value={filters.location}
          onChange={(e) => onChange({ ...filters, location: e.target.value })}
          className="brand-input mt-3"
        />
      </div>

      <button
        onClick={() => onChange(defaultFilters())}
        className="w-full rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-accent/40 hover:text-accent"
      >
        {t("resetFilters")}
      </button>
    </aside>
  );
}

