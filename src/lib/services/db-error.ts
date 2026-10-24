import "server-only";

/** What a supabase-js / PostgREST error carries; only `message` is required. */
type DbError = { message: string; code?: string; details?: string | null; hint?: string | null };

export const DB_FAILURE_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

/**
 * Turn an unexpected DB error into the service-layer failure result (audit L1).
 * The raw Postgres message (constraint / column names) is logged server-side
 * only; the user sees a generic Thai message.
 */
export function dbFailure(
  context: string,
  error: DbError,
): { ok: false; code: "unknown"; message: string } {
  console.error(`[${context}] db error:`, error);
  return { ok: false, code: "unknown", message: DB_FAILURE_MESSAGE };
}
