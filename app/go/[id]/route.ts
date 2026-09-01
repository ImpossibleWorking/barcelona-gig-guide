import { NextRequest, NextResponse } from "next/server";
import { findDemoEvent } from "@/lib/demo-events";
import { isDemoDataEnabled } from "@/lib/events";
import { buildAffiliateUrl } from "@/lib/affiliate";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NormalizedEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = decodeURIComponent(params.id);

  if (isDemoDataEnabled()) {
    const demoEvent = findDemoEvent(eventId);
    if (!demoEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.redirect(buildAffiliateUrl(demoEvent), 302);
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Outbound redirect lookup failed:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.redirect(buildAffiliateUrl(data as NormalizedEvent), 302);
}
