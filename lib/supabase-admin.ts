import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-only client using the service role key, which bypasses RLS.
// This is required so the sync route can upsert events even though the
// `events` table has no public write policy (see supabase/schema.sql).
// NEVER import this file from a client component — the service role key
// must not reach the browser bundle.
//
// Built lazily (only when actually called) rather than at module scope —
// Next.js imports every route module during its build-time "collect page
// data" step regardless of whether the route is ever hit, so constructing
// the client eagerly meant a missing env var crashed the entire deploy
// instead of just failing this one route at request time.
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key);
  }
  return client;
}
