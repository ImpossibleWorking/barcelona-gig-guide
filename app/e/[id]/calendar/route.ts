import { NextResponse } from "next/server";
import { buildEventIcs } from "@/lib/calendar";
import { getEventById } from "@/lib/events";

export const revalidate = 300;

function safeFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "gig"}.ics`;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const event = await getEventById(decodeURIComponent(params.id));
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return new NextResponse(buildEventIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(event.title)}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
