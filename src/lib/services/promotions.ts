import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  computeStampProgress,
  isEligibleToRedeem,
  isValidRequiredStamps,
  STAMP_PER_COMPLETED_BOOKING,
} from "@/lib/promotions/stamp-card";

/**
 * Shop promotions (โปรโมชั่นของร้าน) service. First (and currently only) type is
 * the stamp card (บัตรสะสมแต้ม): "ใช้บริการครบ N ครั้ง รับสิทธิ์ <reward>".
 *
 * Two tables back this (see the migration):
 *   - shop_promotions  — the rule the shop defines.
 *   - promotion_stamps — an append-only ledger; a customer's balance for one
 *     promotion is SUM(amount) (earn +1 each, redeem −required_stamps).
 *
 * Like every service here, all access goes through the service-role client (RLS
 * deny-all), so authorization lives in code: every shop-facing mutation/read is
 * scoped by a compound `.eq("shop_id", shopId)` filter, and `shopId` MUST come
 * from the caller's verified session — never request input. Phone is the
 * customer identity key (mirrors bookings/loyalty_ledger). Functions never throw
 * for domain errors; they return typed discriminated-union results with Thai
 * messages.
 */

// ----- Types --------------------------------------------------------------

export type PromotionType = "stamp_card";

export type ShopPromotionListItem = {
  id: string;
  type: PromotionType;
  title: string;
  description: string | null;
  requiredStamps: number;
  reward: string;
  isActive: boolean;
  /** Distinct customers who currently hold ≥1 stamp (balance > 0). */
  collectorCount: number;
  /** Rewards already granted (count of `redeem` rows). */
  redeemedCount: number;
};

export type PromotionInput = {
  title: string;
  description?: string | null;
  requiredStamps: number;
  reward: string;
  isActive: boolean;
};

export type PromotionMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "invalid" | "not_found" | "unknown";
      message: string;
    };

export type PromotionParticipant = {
  customerPhone: string;
  customerName: string | null;
  /** Net stamp balance, floored at 0. */
  balance: number;
  /** Whole rewards redeemable right now. */
  redeemable: number;
  /** Stamps toward the next reward, in [0, required). */
  towardNext: number;
  /** Rewards this customer has already redeemed in this promotion. */
  redeemedCount: number;
};

export type RedeemResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_eligible" | "not_found" | "unknown";
      message: string;
    };

/** A customer-facing view of one promotion they're collecting stamps in. */
export type CustomerStampCard = {
  promotionId: string;
  shopId: string;
  shopName: string;
  shopHandle: string | null;
  title: string;
  reward: string;
  requiredStamps: number;
  isActive: boolean;
  balance: number;
  redeemable: number;
  towardNext: number;
};

// ----- Internal row shapes -----------------------------------------------

type PromotionRow = {
  id: string;
  type: PromotionType;
  title: string;
  description: string | null;
  required_stamps: number;
  reward: string;
  is_active: boolean;
};

type StampRow = {
  promotion_id: string;
  customer_phone: string;
  amount: number;
  kind: "earn" | "redeem" | "adjust";
};

const UNKNOWN_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const NOT_FOUND_MESSAGE = "ไม่พบโปรโมชั่นนี้";
const INVALID_MESSAGE = "ข้อมูลโปรโมชั่นไม่ถูกต้อง";

// ----- Normalisation (server-side backstop) ------------------------------

type NormalizedPromotion = {
  title: string;
  description: string | null;
  requiredStamps: number;
  reward: string;
  isActive: boolean;
};

/**
 * Server-side backstop normalization — mirrors the action-layer validator but
 * never trusts it: title/reward 1–120 chars, requiredStamps an integer in
 * [1, 100], description ≤ 500 chars.
 */
function normalize(input: PromotionInput): NormalizedPromotion | null {
  const title = input.title.trim();
  if (title.length === 0 || title.length > 120) return null;

  const reward = input.reward.trim();
  if (reward.length === 0 || reward.length > 120) return null;

  if (!isValidRequiredStamps(input.requiredStamps)) return null;

  const description = input.description?.trim() || null;
  if (description && description.length > 500) return null;

  return {
    title,
    description,
    requiredStamps: input.requiredStamps,
    reward,
    isActive: input.isActive,
  };
}

// ----- Read: management list ---------------------------------------------

/**
 * All promotions for one shop, newest first, each enriched with collector +
 * redeemed counts. Reads the shop's whole (small) stamp ledger once and
 * aggregates in memory rather than issuing a query per promotion.
 */
export async function listPromotionsByShop(
  shopId: string,
): Promise<ShopPromotionListItem[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: promos, error: promoErr }, { data: stamps, error: stampErr }] =
    await Promise.all([
      supabase
        .from("shop_promotions")
        .select("id, type, title, description, required_stamps, reward, is_active")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false }),
      supabase
        .from("promotion_stamps")
        .select("promotion_id, customer_phone, amount, kind")
        .eq("shop_id", shopId),
    ]);

  if (promoErr || !promos) {
    if (promoErr) console.error("listPromotionsByShop promo error:", promoErr);
    return [];
  }
  if (stampErr) console.error("listPromotionsByShop stamp error:", stampErr);

  // Aggregate per promotion: net balance per phone (→ collector count) and the
  // number of redeem rows (→ rewards granted).
  const balances = new Map<string, Map<string, number>>(); // promo → phone → net
  const redeemed = new Map<string, number>(); // promo → redeem-row count
  for (const s of (stamps as StampRow[] | null) ?? []) {
    const perPhone = balances.get(s.promotion_id) ?? new Map<string, number>();
    perPhone.set(s.customer_phone, (perPhone.get(s.customer_phone) ?? 0) + s.amount);
    balances.set(s.promotion_id, perPhone);
    if (s.kind === "redeem") {
      redeemed.set(s.promotion_id, (redeemed.get(s.promotion_id) ?? 0) + 1);
    }
  }

  return (promos as PromotionRow[]).map((p) => {
    const perPhone = balances.get(p.id);
    let collectorCount = 0;
    if (perPhone) {
      for (const net of perPhone.values()) if (net > 0) collectorCount += 1;
    }
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      description: p.description,
      requiredStamps: p.required_stamps,
      reward: p.reward,
      isActive: p.is_active,
      collectorCount,
      redeemedCount: redeemed.get(p.id) ?? 0,
    };
  });
}

// ----- Write: CRUD --------------------------------------------------------

/** Create a promotion. Format validation also runs in the action layer; this is the backstop. */
export async function createPromotion(
  shopId: string,
  input: PromotionInput,
): Promise<PromotionMutationResult> {
  const fields = normalize(input);
  if (!fields) return { ok: false, code: "invalid", message: INVALID_MESSAGE };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_promotions")
    .insert({
      shop_id: shopId,
      type: "stamp_card",
      title: fields.title,
      description: fields.description,
      required_stamps: fields.requiredStamps,
      reward: fields.reward,
      is_active: fields.isActive,
    })
    .select("id")
    .single();

  if (error) return { ok: false, code: "unknown", message: error.message };
  return { ok: true, id: data.id as string };
}

/**
 * Update a promotion. Ownership enforced by the compound `id + shop_id` filter —
 * a mismatch returns zero rows → `not_found`.
 */
export async function updatePromotion(
  shopId: string,
  promotionId: string,
  input: PromotionInput,
): Promise<PromotionMutationResult> {
  const fields = normalize(input);
  if (!fields) return { ok: false, code: "invalid", message: INVALID_MESSAGE };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_promotions")
    .update({
      title: fields.title,
      description: fields.description,
      required_stamps: fields.requiredStamps,
      reward: fields.reward,
      is_active: fields.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", promotionId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: NOT_FOUND_MESSAGE };
  return { ok: true, id: data.id as string };
}

/** Toggle a promotion active/paused. Compound `id + shop_id` filter enforces ownership. */
export async function setPromotionActive(
  shopId: string,
  promotionId: string,
  isActive: boolean,
): Promise<PromotionMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_promotions")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", promotionId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: NOT_FOUND_MESSAGE };
  return { ok: true, id: data.id as string };
}

/**
 * Delete a promotion. Compound `id + shop_id` filter enforces ownership; the
 * `promotion_stamps` rows cascade away (ON DELETE CASCADE).
 */
export async function deletePromotion(
  shopId: string,
  promotionId: string,
): Promise<PromotionMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_promotions")
    .delete()
    .eq("id", promotionId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: NOT_FOUND_MESSAGE };
  return { ok: true, id: data.id as string };
}

// ----- Write: accrual on completed booking -------------------------------

/**
 * Award one stamp toward every ACTIVE stamp-card promotion of the shop when a
 * booking is completed. Idempotent per (promotion, booking) via the unique
 * index — a booking toggled completed twice collapses to a no-op (`23505`).
 * Only runs when `phone` is set (anonymous bookings have no stamp identity).
 *
 * Called from the booking-status transition off the response path (`after`), so
 * it must never throw: every failure is logged and swallowed.
 */
export async function accruePromotionStamps(
  bookingId: string,
  shopId: string,
  phone: string | null,
): Promise<void> {
  if (!phone) return;

  const supabase = getSupabaseAdmin();
  const { data: promos, error } = await supabase
    .from("shop_promotions")
    .select("id")
    .eq("shop_id", shopId)
    .eq("type", "stamp_card")
    .eq("is_active", true);

  if (error) {
    console.error("accruePromotionStamps read error:", error);
    return;
  }
  const rows = (promos as { id: string }[] | null) ?? [];
  if (rows.length === 0) return;

  for (const promo of rows) {
    const { error: insertError } = await supabase.from("promotion_stamps").insert({
      promotion_id: promo.id,
      shop_id: shopId,
      customer_phone: phone,
      kind: "earn",
      amount: STAMP_PER_COMPLETED_BOOKING,
      booking_id: bookingId,
      note: "ใช้บริการเสร็จสิ้น",
    });
    // unique(promotion_id, booking_id) → already counted for this booking. No-op.
    if (insertError && insertError.code !== "23505") {
      console.error("accruePromotionStamps insert error:", insertError);
    }
  }
}

// ----- Read: participants (shop view) ------------------------------------

/**
 * Customers collecting stamps in one promotion, most progress first. Ownership
 * is enforced by first loading the promotion scoped to the shop; an unknown /
 * other-shop promotion yields an empty list. Names are resolved from the
 * `customers` table, falling back to the phone for anonymous bookers.
 */
export async function listPromotionParticipants(
  shopId: string,
  promotionId: string,
): Promise<PromotionParticipant[]> {
  const supabase = getSupabaseAdmin();

  const { data: promo, error: promoErr } = await supabase
    .from("shop_promotions")
    .select("id, required_stamps")
    .eq("id", promotionId)
    .eq("shop_id", shopId)
    .maybeSingle<{ id: string; required_stamps: number }>();

  if (promoErr) {
    console.error("listPromotionParticipants promo error:", promoErr);
    return [];
  }
  if (!promo) return [];

  const { data: stamps, error: stampErr } = await supabase
    .from("promotion_stamps")
    .select("customer_phone, amount, kind")
    .eq("promotion_id", promotionId)
    .eq("shop_id", shopId);

  if (stampErr) {
    console.error("listPromotionParticipants stamp error:", stampErr);
    return [];
  }

  const balance = new Map<string, number>();
  const redeemed = new Map<string, number>();
  for (const s of (stamps as Omit<StampRow, "promotion_id">[] | null) ?? []) {
    balance.set(s.customer_phone, (balance.get(s.customer_phone) ?? 0) + s.amount);
    if (s.kind === "redeem") {
      redeemed.set(s.customer_phone, (redeemed.get(s.customer_phone) ?? 0) + 1);
    }
  }

  const phones = [...balance.keys()];
  if (phones.length === 0) return [];

  // Resolve display names in one query; phones without a customer row keep null.
  const names = new Map<string, string>();
  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("phone, name")
    .in("phone", phones);
  if (custErr) console.error("listPromotionParticipants customers error:", custErr);
  for (const c of (customers as { phone: string; name: string | null }[] | null) ?? []) {
    if (c.name) names.set(c.phone, c.name);
  }

  return phones
    .map((phone) => {
      const progress = computeStampProgress(
        balance.get(phone) ?? 0,
        promo.required_stamps,
      );
      return {
        customerPhone: phone,
        customerName: names.get(phone) ?? null,
        balance: progress.balance,
        redeemable: progress.redeemable,
        towardNext: progress.towardNext,
        redeemedCount: redeemed.get(phone) ?? 0,
      };
    })
    .sort((a, b) => b.balance - a.balance);
}

// ----- Write: redeem a reward (shop grants it) ---------------------------

/**
 * Redeem one reward for a customer: verifies the promotion belongs to the shop,
 * that the customer's balance covers a full block, then appends a `redeem` row
 * (−required_stamps), leaving any surplus stamps for the next cycle.
 */
export async function redeemPromotionReward(
  shopId: string,
  promotionId: string,
  customerPhone: string,
): Promise<RedeemResult> {
  const supabase = getSupabaseAdmin();

  const { data: promo, error: promoErr } = await supabase
    .from("shop_promotions")
    .select("id, required_stamps")
    .eq("id", promotionId)
    .eq("shop_id", shopId)
    .maybeSingle<{ id: string; required_stamps: number }>();

  if (promoErr) {
    console.error("redeemPromotionReward promo error:", promoErr);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }
  if (!promo) return { ok: false, code: "not_found", message: NOT_FOUND_MESSAGE };

  const { data: stamps, error: stampErr } = await supabase
    .from("promotion_stamps")
    .select("amount")
    .eq("promotion_id", promotionId)
    .eq("customer_phone", customerPhone);

  if (stampErr) {
    console.error("redeemPromotionReward stamp error:", stampErr);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }

  const balance = ((stamps as { amount: number }[] | null) ?? []).reduce(
    (acc, r) => acc + r.amount,
    0,
  );
  if (!isEligibleToRedeem(balance, promo.required_stamps)) {
    return {
      ok: false,
      code: "not_eligible",
      message: "แต้มสะสมยังไม่ครบสำหรับแลกสิทธิ์",
    };
  }

  const { error: insertError } = await supabase.from("promotion_stamps").insert({
    promotion_id: promotionId,
    shop_id: shopId,
    customer_phone: customerPhone,
    kind: "redeem",
    amount: -promo.required_stamps,
    note: "แลกสิทธิ์รางวัล",
  });

  if (insertError) {
    console.error("redeemPromotionReward insert error:", insertError);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }
  return { ok: true };
}

// ----- Read: customer-facing stamp cards ---------------------------------

/**
 * The customer's stamp cards — one per promotion they hold a positive balance
 * in — with the shop name and progress. `phone` MUST come from the verified
 * customer session. Degrades to an empty list on any infra error.
 */
export async function getCustomerStampCards(
  phone: string,
): Promise<CustomerStampCard[]> {
  const supabase = getSupabaseAdmin();

  const { data: stamps, error: stampErr } = await supabase
    .from("promotion_stamps")
    .select("promotion_id, amount")
    .eq("customer_phone", phone);

  if (stampErr || !stamps) {
    if (stampErr) console.error("getCustomerStampCards stamp error:", stampErr);
    return [];
  }

  const balance = new Map<string, number>();
  for (const s of stamps as { promotion_id: string; amount: number }[]) {
    balance.set(s.promotion_id, (balance.get(s.promotion_id) ?? 0) + s.amount);
  }
  const ids = [...balance.keys()].filter((id) => (balance.get(id) ?? 0) > 0);
  if (ids.length === 0) return [];

  const { data: promos, error: promoErr } = await supabase
    .from("shop_promotions")
    .select(
      "id, shop_id, title, reward, required_stamps, is_active, shops(name, handle)",
    )
    .in("id", ids);

  if (promoErr || !promos) {
    if (promoErr) console.error("getCustomerStampCards promo error:", promoErr);
    return [];
  }

  type Row = {
    id: string;
    shop_id: string;
    title: string;
    reward: string;
    required_stamps: number;
    is_active: boolean;
    shops: { name: string; handle: string | null } | null;
  };

  return (promos as unknown as Row[])
    .map((p) => {
      const progress = computeStampProgress(
        balance.get(p.id) ?? 0,
        p.required_stamps,
      );
      return {
        promotionId: p.id,
        shopId: p.shop_id,
        shopName: p.shops?.name ?? "",
        shopHandle: p.shops?.handle ?? null,
        title: p.title,
        reward: p.reward,
        requiredStamps: p.required_stamps,
        isActive: p.is_active,
        balance: progress.balance,
        redeemable: progress.redeemable,
        towardNext: progress.towardNext,
      };
    })
    .sort((a, b) => b.redeemable - a.redeemable || b.balance - a.balance);
}
