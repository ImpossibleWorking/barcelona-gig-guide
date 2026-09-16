import { ImageResponse } from "next/og";
import { formatEventDateTime } from "@/lib/datetime";
import { getEventById } from "@/lib/events";

export const alt = "Barcelona Gig Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: { id: string } }) {
  const event = await getEventById(decodeURIComponent(params.id));
  const title = event?.title ?? "Barcelona Gig Guide";
  const venue = event?.venue_name ?? "Barcelona";
  const date = event ? formatEventDateTime(event.start_datetime, "en") : "";
  const titleSize = title.length > 56 ? 44 : title.length > 36 ? 54 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(ellipse at top right, rgba(45,212,191,0.22), transparent 55%), radial-gradient(ellipse at bottom left, rgba(14,165,233,0.16), transparent 50%), linear-gradient(160deg, #0b1417, #152022)",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#5eead4",
            fontSize: 28,
            letterSpacing: 10,
            fontWeight: 700,
          }}
        >
          BCN GIGS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "white",
              fontSize: titleSize,
              lineHeight: 1.15,
              fontWeight: 700,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", color: "#a1a1aa", fontSize: 30, marginTop: 18 }}>
            {venue}
          </div>
          {date ? (
            <div style={{ display: "flex", color: "#2dd4bf", fontSize: 24, marginTop: 12 }}>
              {date}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size }
  );
}
