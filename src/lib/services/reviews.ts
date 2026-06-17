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
 * booking (enforced by the `UNIQUE(booking_id)` constraint). Reviews are
 * FINAL once submitted — there is no edit path.
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
};

/** A review as shown on the public shop detail page (name already masked). */
export type ShopReviewItem = {
  id: string;
  rating: number; // 1-5 integer
  comment: string | null;
  reviewerName: string; // ALREADY masked, e.g. "สมชาย ก." or "สมาชิก Quego"
  createdAt: string; // ISO timestamp (created_at)
};

export type CreateReviewResult =
  | { ok: true; reviewId: string }
  | {
      ok: false;
      code: "not_eligible" | "already_reviewed" | "invalid" | "unknown";
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

/** A featured review for the public homepage testimonials section. */
export type FeaturedReview = {
  id: string;
  rating: number; // 4 or 5 (only high ratings are featured)
  comment: string; // never blank — featured reviews require a comment
  reviewerName: string; // ALREADY masked (PDPA), e.g. "สมชาย ก."
  shopName: string | null; // joined shop name, null if unavailable
  createdAt: string; // ISO timestamp (created_at)
};

/** Review row joined with the shop name for the homepage featured list. */
type FeaturedReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
  shops: { name: string | null } | null;
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
export function validateReviewInput(
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
export function maskReviewerName(name: string | null): string {
  const trimmed = (name ?? "").trim();
  if (trimmed.length === 0) return "สมาชิก Quego";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

// ----- Write: create (reviews are final, no edit) -------------------------

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

// ----- Read: homepage testimonials + global aggregate ---------------------

/**
 * Fetch material for the public homepage's social-proof block in one place:
 * a short list of "featured" reviews (high rating + a written comment, newest
 * first) plus a system-wide totals aggregate.
 *
 * Featured reviews are the marketing-quality ones: `rating >= 4` AND a non-empty
 * comment. Reviewer names are masked here (PDPA) and the shop name is joined so
 * a testimonial can name the ร้าน. Like the other read paths, any infra error
 * degrades to an empty, zero-rated result rather than throwing — a missing
 * social-proof block must never break the homepage.
 */
export async function getHomepageReviewHighlights(
  limit = 6,
): Promise<{
  featured: FeaturedReview[];
  totalReviews: number;
  avgRating: number | null;
}> {
  const empty = { featured: [], totalReviews: 0, avgRating: null };
  const supabase = getSupabaseAdmin();

  // Featured list: high rating + a written comment, newest first, joined to the
  // shop name. `.not("comment", "is", null)` filters NULL comments at the DB; a
  // whitespace-only comment is filtered in JS below (cheap, no DB function).
  const featuredQuery = supabase
    .from("reviews")
    .select("id, rating, comment, customer_name, created_at, shops(name)")
    .gte("rating", 4)
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Global aggregate over every review (independent of the featured filter).
  const aggregateQuery = supabase.from("reviews").select("rating");

  const [{ data: featuredData, error: featuredError }, { data: aggData, error: aggError }] =
    await Promise.all([featuredQuery, aggregateQuery]);

  if (featuredError || aggError || !featuredData || !aggData) {
    if (featuredError) console.error("getHomepageReviewHighlights featured error:", featuredError);
    if (aggError) console.error("getHomepageReviewHighlights aggregate error:", aggError);
    return empty;
  }

  const featured: FeaturedReview[] = (featuredData as unknown as FeaturedReviewRow[])
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: (r.comment ?? "").trim(),
      reviewerName: maskReviewerName(r.customer_name),
      shopName: r.shops?.name ?? null,
      createdAt: r.created_at,
    }))
    // Drop whitespace-only comments that survived the NULL filter.
    .filter((r) => r.comment.length > 0);

  const ratings = (aggData as unknown as { rating: number }[]).map((r) => r.rating);
  const totalReviews = ratings.length;
  const avgRating = totalReviews
    ? Math.round((ratings.reduce((acc, n) => acc + n, 0) / totalReviews) * 10) / 10
    : null;

  return { featured, totalReviews, avgRating };
}
