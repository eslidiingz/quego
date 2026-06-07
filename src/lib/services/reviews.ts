import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Reviews service. Like every other service here, all DB access goes through
 * the service-role client (RLS deny-all on `reviews`), so every authorization
 * decision is made in application code rather than at the database layer.
 *
 * SRP: review eligibility + persistence + aggregation for ratings. It never
 * sets cookies, redirects, or throws for domain errors — callers map the
 * typed results into Thai-language UI.
 *
 * Eligibility rule: a review is allowed ONLY for a logged-in customer whose
 * booking the shop marked `completed`, and there is at most ONE review per
 * booking (enforced by the `UNIQUE(booking_id)` constraint).
 */

// ----- Types --------------------------------------------------------------

export type ShopRatingSummary = {
  /** Mean rating rounded to 1 decimal (e.g. 4.3); 0 when count === 0. */
  average: number;
  count: number;
};

/** A customer's own review, attached to their booking in the "my queue" view. */
export type BookingReview = {
  id: string;
  rating: number; // 1-5 integer
  comment: string | null;
  /** True once the review has been edited (updated_at > created_at). A review
   *  may be edited only ONCE — when true the edit affordance is spent. */
  edited: boolean;
};

/** A review as shown on the public shop detail page (name already masked). */
export type ShopReviewItem = {
  id: string;
  rating: number; // 1-5 integer
  comment: string | null;
  reviewerName: string; // ALREADY masked, e.g. "สมชาย ก." or "สมาชิก Queva"
  createdAt: string; // ISO timestamp (created_at)
};

export type CreateReviewResult =
  | { ok: true; reviewId: string }
  | {
      ok: false;
      code: "not_eligible" | "already_reviewed" | "invalid" | "unknown";
      message: string;
    };

export type UpdateReviewResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_found" | "invalid" | "edit_limit" | "unknown";
      message: string;
    };

// ----- Internal row shapes -----------------------------------------------

/** The booking columns we read to check ownership + eligibility on create. */
type EligibleBookingRow = {
  id: string;
  shop_id: string;
  customer_name: string | null;
};

/** A review row as selected for the public detail-page list. */
type ShopReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
};

/** Minimal review row for the batched discovery-page aggregate. */
type RatingRow = {
  shop_id: string;
  rating: number;
};

// ----- Validation ---------------------------------------------------------

const INVALID_RATING_MESSAGE = "กรุณาให้คะแนน 1–5 ดาว";
const COMMENT_TOO_LONG_MESSAGE = "ความคิดเห็นต้องไม่เกิน 1000 ตัวอักษร";
const UNKNOWN_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const MAX_COMMENT_LENGTH = 1000;

/**
 * Validate + normalize review input. Rating must be an integer 1–5. The
 * comment is optional: blank/whitespace collapses to null, and anything over
 * 1000 characters is rejected. Returns the normalized comment on success so
 * callers persist exactly what we validated.
 */
function validateReviewInput(
  rating: number,
  comment: string | null,
):
  | { ok: true; comment: string | null }
  | { ok: false; message: string } {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: INVALID_RATING_MESSAGE };
  }
  if (comment == null) return { ok: true, comment: null };
  const c = comment.trim();
  if (c.length === 0) return { ok: true, comment: null };
  if (c.length > MAX_COMMENT_LENGTH) {
    return { ok: false, message: COMMENT_TOO_LONG_MESSAGE };
  }
  return { ok: true, comment: c };
}

/**
 * Mask a reviewer's display name to "first last-initial" (e.g. "สมชาย ก.").
 * Falls back to a generic label for blank names, and returns a single-token
 * name unchanged (there is no surname to abbreviate).
 */
function maskReviewerName(name: string | null): string {
  const trimmed = (name ?? "").trim();
  if (trimmed.length === 0) return "สมาชิก Queva";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

// ----- Write: create + edit -----------------------------------------------

/**
 * Create a review for a completed booking. Eligibility and ownership are
 * enforced by a compound filter on `bookings` (id + customer_phone + status),
 * never by trusting the caller — `customerPhone` MUST come from the verified
 * customer session. The `UNIQUE(booking_id)` constraint is the final backstop
 * against double reviews under a race (Postgres `23505`).
 */
export async function createReview(
  bookingId: string,
  customerPhone: string,
  rating: number,
  comment: string | null,
): Promise<CreateReviewResult> {
  const validation = validateReviewInput(rating, comment);
  if (!validation.ok) {
    return { ok: false, code: "invalid", message: validation.message };
  }

  const supabase = getSupabaseAdmin();

  // The booking must belong to this customer AND be completed. A non-matching
  // id / phone / status all collapse to "no row" → not eligible.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, shop_id, customer_name")
    .eq("id", bookingId)
    .eq("customer_phone", customerPhone)
    .eq("status", "completed")
    .maybeSingle<EligibleBookingRow>();

  if (bookingError) {
    console.error("createReview booking lookup error:", bookingError);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }
  if (!booking) {
    return {
      ok: false,
      code: "not_eligible",
      message: "รีวิวได้เฉพาะการจองที่ใช้บริการเสร็จสิ้นแล้วเท่านั้น",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("reviews")
    .insert({
      booking_id: bookingId,
      shop_id: booking.shop_id,
      customer_phone: customerPhone,
      customer_name: booking.customer_name,
      rating,
      comment: validation.comment,
    })
    .select("id")
    .single();

  if (insertError) {
    // UNIQUE(booking_id) violation raises SQLSTATE 23505 — same detection as
    // createBooking's conflict check — meaning this booking was already
    // reviewed (possibly by a concurrent request).
    if (insertError.code === "23505") {
      return {
        ok: false,
        code: "already_reviewed",
        message: "คุณได้รีวิวการจองนี้ไปแล้ว",
      };
    }
    // Log the real DB detail server-side; return a generic message so we
    // don't leak schema/constraint names to the client.
    console.error("createReview insert error:", insertError);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }

  return { ok: true, reviewId: inserted!.id as string };
}

/**
 * Edit an existing review. Ownership is enforced by a compound filter on
 * `id` + `customer_phone` (the latter from the verified session), so a
 * customer can only edit their own review. `updated_at` is set explicitly:
 * its column default only applies on INSERT, and there is no trigger to
 * refresh it on UPDATE.
 *
 * A review may be edited only ONCE. We detect "already edited" by comparing
 * `updated_at` against `created_at` (both default to the same `now()` on
 * INSERT, so they are equal until the first edit bumps `updated_at`). This is
 * a read-then-write rather than an atomic CAS: the worst case under a same-user
 * race is two edits instead of one — a cosmetic limit, not a security boundary
 * — so a non-atomic check is acceptable here. The client also disables the
 * edit button once `edited` is true; this is the server-side backstop.
 */
export async function updateReview(
  reviewId: string,
  customerPhone: string,
  rating: number,
  comment: string | null,
): Promise<UpdateReviewResult> {
  const validation = validateReviewInput(rating, comment);
  if (!validation.ok) {
    return { ok: false, code: "invalid", message: validation.message };
  }

  const supabase = getSupabaseAdmin();

  // Ownership + edit-once gate: the review must belong to this customer, and
  // it must not have been edited before.
  const { data: existing, error: lookupError } = await supabase
    .from("reviews")
    .select("id, created_at, updated_at")
    .eq("id", reviewId)
    .eq("customer_phone", customerPhone)
    .maybeSingle<{ id: string; created_at: string; updated_at: string }>();

  if (lookupError) {
    console.error("updateReview lookup error:", lookupError);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }
  if (!existing) {
    return { ok: false, code: "not_found", message: "ไม่พบรีวิวของคุณ" };
  }
  if (
    new Date(existing.updated_at).getTime() >
    new Date(existing.created_at).getTime()
  ) {
    return {
      ok: false,
      code: "edit_limit",
      message: "แก้ไขรีวิวได้เพียงครั้งเดียวเท่านั้น",
    };
  }

  const { data, error } = await supabase
    .from("reviews")
    .update({
      rating,
      comment: validation.comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("customer_phone", customerPhone)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("updateReview error:", error);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }
  if (!data) {
    return { ok: false, code: "not_found", message: "ไม่พบรีวิวของคุณ" };
  }
  return { ok: true };
}

// ----- Read: public shop detail page --------------------------------------

/**
 * List a shop's reviews newest-first together with an aggregate summary.
 * Reviewer names are masked here so the page never sees raw display names.
 * On any infra error we degrade to an empty, zero-rated result rather than
 * throwing — a missing reviews block shouldn't break the detail page.
 */
export async function listShopReviews(
  shopId: string,
): Promise<{ summary: ShopRatingSummary; reviews: ShopReviewItem[] }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, customer_name, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("listShopReviews error:", error);
    return { summary: { average: 0, count: 0 }, reviews: [] };
  }

  const rows = data as unknown as ShopReviewRow[];
  const reviews: ShopReviewItem[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    reviewerName: maskReviewerName(r.customer_name),
    createdAt: r.created_at,
  }));

  const count = rows.length;
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;

  return { summary: { average, count }, reviews };
}

// ----- Read: batched aggregate for discovery ------------------------------

/**
 * Compute a rating summary for many shops in one query, for the discovery
 * list. Shops with no reviews are simply absent from the returned map —
 * callers default those to `{ average: 0, count: 0 }`.
 */
export async function getRatingSummariesForShops(
  shopIds: string[],
): Promise<Map<string, ShopRatingSummary>> {
  const summaries = new Map<string, ShopRatingSummary>();
  if (shopIds.length === 0) return summaries;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviews")
    .select("shop_id, rating")
    .in("shop_id", shopIds);

  if (error || !data) {
    if (error) console.error("getRatingSummariesForShops error:", error);
    return summaries;
  }

  // Accumulate sum + count per shop, then fold into rounded averages.
  const totals = new Map<string, { sum: number; count: number }>();
  for (const r of data as unknown as RatingRow[]) {
    const acc = totals.get(r.shop_id) ?? { sum: 0, count: 0 };
    acc.sum += r.rating;
    acc.count += 1;
    totals.set(r.shop_id, acc);
  }
  for (const [shopId, { sum, count }] of totals) {
    summaries.set(shopId, {
      average: Math.round((sum / count) * 10) / 10,
      count,
    });
  }

  return summaries;
}
