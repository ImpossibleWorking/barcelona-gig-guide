"use client";

import { getOutboundPath } from "@/lib/affiliate";
import { trackTicketClick } from "@/lib/analytics";
import { NormalizedEvent } from "@/lib/types";

export default function TicketLink({
  event,
  className,
  children,
  ariaLabel,
}: {
  event: Pick<NormalizedEvent, "id" | "title" | "source" | "venue_name">;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={getOutboundPath(event.id)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={() => trackTicketClick(event)}
    >
      {children}
    </a>
  );
}
