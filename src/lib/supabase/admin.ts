import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS — only use in server code that
 * has already authenticated the caller (e.g. behind admin session middleware).
 *
 * Reads SUPABASE_SECRET_KEY from the environment. The key is intentionally
 * NOT prefixed with NEXT_PUBLIC_ so it never ships to the browser bundle.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
