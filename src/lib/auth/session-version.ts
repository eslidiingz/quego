import "server-only";
import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type IdentityTable = "admins" | "shops" | "customers";

/**
 * Reads an identity row's `session_version` (audit M7), uncached. Use this when
 * MINTING a token: a re-mint right after a PIN change must see the bumped value,
 * not the one cached earlier in the same request. Returns null when the row is
 * gone or the read fails — the caller then treats the session as revoked.
 */
export async function fetchSessionVersion(
  table: IdentityTable,
  id: string,
): Promise<number | null> {
  const { data, error } = await getSupabaseAdmin()
      .from(table)
      .select("session_version")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error(`readSessionVersion(${table}) error:`, error);
      return null;
    }
    return (data?.session_version as number | undefined) ?? null;
}

/**
 * Per-request cached read for VERIFYING sessions, so a page that reads the
 * session several times (layout + page + actions) costs one query.
 */
export const readSessionVersion = cache(fetchSessionVersion);
