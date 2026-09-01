import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Browser/anon client — read-only via RLS policy (see supabase/schema.sql).
// Safe to use in client components since it only carries the public anon key.
//
// Built lazily for the same reason as lib/supabase-admin.ts: Next.js imports
// this at build time regardless of whether a page actually runs, so a
// missing env var would otherwise crash the whole build rather than just
// that page at request time.
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    client = createClient(url, key);
  }
  return client;
}
