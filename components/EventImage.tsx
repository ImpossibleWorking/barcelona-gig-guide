"use client";

import { useState } from "react";
import { EventGenre } from "@/lib/types";

function MusicIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 text-accent" fill="none" aria-hidden="true">
      <path
        d="M26 46a8 8 0 1 1-8-8 8 8 0 0 1 8 8Z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M26 46V16l24-6v30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 40a8 8 0 1 1-8-8 8 8 0 0 1 8 8Z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 text-accent" fill="none" aria-hidden="true">
      <rect x="22" y="8" width="20" height="28" rx="10" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 30a16 16 0 0 0 32 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 46v8M22 56h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DiscIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 text-accent" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 12v6M32 46v6M12 32h6M46 32h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FestivalIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 text-accent" fill="none" aria-hidden="true">
      <path d="M32 8 12 52h40L32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 40h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function GenreIcon({ genre }: { genre?: EventGenre | null }) {
  if (genre === "comedy") return <MicIcon />;
  if (genre === "clubbing") return <DiscIcon />;
  if (genre === "festival") return <FestivalIcon />;
  return <MusicIcon />;
}

export default function EventImage({
  src,
  alt,
  genre,
  className = "",
}: {
  src: string | null;
  alt: string;
  genre?: EventGenre | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden bg-zinc-900 ${className}`}>
      {showPlaceholder ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_top_right,rgba(45,212,191,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.12),transparent_50%),linear-gradient(160deg,#0b1417,#152022)]"
          aria-hidden="true"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/25 bg-accent-muted">
            <GenreIcon genre={genre} />
          </div>
          <p className="font-display text-lg tracking-[0.18em] text-accent/80">BCN GIGS</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- external listing images
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}
