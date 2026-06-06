import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { lockedMessage } from "@/lib/auth/lockout";
import {
  registerFailedAttempt,
  clearFailedAttempts,
} from "@/lib/auth/lockout-store";
import { getBangkokNow } from "@/lib/time/bangkok";
import {
  DAYS_OF_WEEK,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/services/business-hours";
import {
  listActiveServicesByShop,
  listActiveServicesForShops,
  type BookableService,
} from "@/lib/services/services";

// ----- Types --------------------------------------------------------------

export type ShopStatus = "pending" | "approved" | "rejected" | "suspended";

export type CategoryOption = {
  id: string;
  name: string;
};

export type CreateShopInput = {
  name: string;
  categoryId: string;
  description?: string;
  address?: string;
  /** Thai province (จังหวัด), canonical name from the location dataset. */
  province: string;
  /** Thai district (เขต/อำเภอ), canonical name belonging to province. */
  district: string;
  /** Thai sub-district (แขวง/ตำบล), canonical name belonging to district. */
  subdistrict: string;
  contactPhone?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
};

export type CreateShopResult =
  | { ok: true; id: string }
  | { ok: false; code: "category_not_found" | "duplicate" | "unknown"; message: string };

export type ShopListItem = {
  id: string;
  name: string;
  status: ShopStatus;
  category_name: string | null;
  owner_name: string;
  owner_phone: string;
  owner_email: string | null;
  contact_phone: string | null;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  rejection_reason: string | null;
  service_duration_minutes: number;
  created_at: string;
  reviewed_at: string | null;
};

export type ShopCountsByStatus = Record<ShopStatus, number>;

export type ModerationResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "invalid_transition" | "unknown"; message: string };

export type UpdateShopInput = CreateShopInput;

export type UpdateShopResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "category_not_found" | "duplicate" | "unknown"; message: string };

export type ShopLoginInfo = {
  id: string;
  name: string;
  phone: string;
  /** True when the shop owner has already set a PIN (returning login). */
  hasPin: boolean;
};

export type PinResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_found" | "bad_pin" | "pin_already_set" | "locked" | "unknown";
      message: string;
    };

const PIN_LENGTH = 6;
const PIN_RE = /^\d{6}$/u;

// ----- Public read: customer portal ---------------------------------------

export type PublicShopDetail = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  contact_phone: string | null;
  /**
   * Shop-level default duration. Only meaningful as a fallback for shops that
   * haven't built a per-service catalogue — prefer `services` below for
   * customer-facing display so each service shows its own duration/price.
   */
  service_duration_minutes: number;
  /** Active services (the บริการ catalogue), ordered for display. */
  services: BookableService[];
  category: { id: string; name: string; icon: string | null };
  hours: BusinessHour[];
};

type ShopDetailRow = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  contact_phone: string | null;
  service_duration_minutes: number;
  shop_categories: { id: string; name: string; icon: string | null } | null;
};

/**
 * Returns one approved shop's full public profile for the detail page:
 * basic info + category + weekly business hours.
 *
 * SRP: shape data for the customer-facing detail view only. Returns null
 * for shops that don't exist or aren't `approved` — the page maps that
 * to a 404 / notFound().
 */
export async function getPublicShopById(
  id: string,
): Promise<PublicShopDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: shopData, error: shopError } = await supabase
    .from("shops")
    .select(
      `
        id, name, description, address, province, district, subdistrict, contact_phone, service_duration_minutes,
        shop_categories ( id, name, icon )
      `,
    )
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (shopError || !shopData) return null;
  const row = shopData as unknown as ShopDetailRow;

  const [{ data: hoursData }, services] = await Promise.all([
    supabase
      .from("shop_business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("shop_id", id),
    listActiveServicesByShop(id),
  ]);

  const byDay = new Map<DayOfWeek, BusinessHour>();
  for (const h of hoursData ?? []) {
    const day = h.day_of_week as DayOfWeek;
    byDay.set(day, {
      dayOfWeek: day,
      isOpen: h.is_open,
      openTime: h.open_time ? h.open_time.slice(0, 5) : null,
      closeTime: h.close_time ? h.close_time.slice(0, 5) : null,
    });
  }
  const hours: BusinessHour[] = DAYS_OF_WEEK.map(
    (d) => byDay.get(d) ?? { dayOfWeek: d, isOpen: false, openTime: null, closeTime: null },
  );

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address,
    province: row.province,
    district: row.district,
    subdistrict: row.subdistrict,
    contact_phone: row.contact_phone,
    service_duration_minutes: row.service_duration_minutes,
    services,
    category: row.shop_categories ?? { id: "", name: "—", icon: null },
    hours,
  };
}

/**
 * Whether a shop is currently taking walk-ins, derived from today's business
 * hours vs. Bangkok-local "now". `"unknown"` means the shop hasn't configured
 * hours for today — we render no badge rather than guess.
 */
export type ShopOpenState = "open" | "closed" | "unknown";

export type PublicShop = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  service_duration_minutes: number;
  /** Active services (บริการ) — drives the card's service chips, "เริ่มต้น ฿"
   *  price, and free-text service search on the discovery page. */
  services: BookableService[];
  openState: ShopOpenState;
};

export type CategoryWithShops = {
  category: { id: string; name: string; icon: string | null };
  shops: PublicShop[];
};

type TodayHoursRow = {
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

/**
 * Pure open/closed decision for a single shop, given its row for *today* and
 * the current "HH:MM". Keeping it pure makes the rule trivially testable and
 * impossible to disagree with itself across call sites.
 */
function computeOpenState(
  row: TodayHoursRow | undefined,
  nowHHMM: string,
): ShopOpenState {
  if (!row) return "unknown";
  if (!row.is_open || !row.open_time || !row.close_time) return "closed";
  const open = row.open_time.slice(0, 5);
  const close = row.close_time.slice(0, 5);
  return nowHHMM >= open && nowHHMM < close ? "open" : "closed";
}

/**
 * Returns active categories together with their approved shops, sorted
 * for the customer-facing portal. Categories with zero approved shops are
 * filtered out — empty sections on a discovery page feel broken.
 *
 * SRP: read-only assembly for the portal — no auth, no caching nuance,
 * no analytics. DIP: the portal page consumes this typed result and never
 * touches Supabase directly.
 */
export async function listPublicShopsByCategory(): Promise<CategoryWithShops[]> {
  const supabase = getSupabaseAdmin();

  const [categoriesResult, shopsResult] = await Promise.all([
    supabase
      .from("shop_categories")
      .select("id, name, icon")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("shops")
      .select(
        "id, name, description, address, province, district, subdistrict, service_duration_minutes, category_id",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  if (categoriesResult.error || shopsResult.error) return [];

  const shopRows = shopsResult.data ?? [];

  // Batch-load only *today's* business-hours row for the shops we're about to
  // render, then derive open/closed once. One extra query for the whole page
  // instead of N detail fetches.
  const now = getBangkokNow();
  const openByShop = new Map<string, ShopOpenState>();
  let servicesByShop = new Map<string, BookableService[]>();
  const shopIds = shopRows.map((s) => s.id);
  if (shopIds.length > 0) {
    // Today's hours + every shop's active services in two parallel batched
    // queries — the card needs both, and N+1 per shop would be wasteful.
    const [hoursResult, services] = await Promise.all([
      supabase
        .from("shop_business_hours")
        .select("shop_id, is_open, open_time, close_time")
        .in("shop_id", shopIds)
        .eq("day_of_week", now.dayOfWeek),
      listActiveServicesForShops(shopIds),
    ]);
    servicesByShop = services;
    for (const h of hoursResult.data ?? []) {
      openByShop.set(
        h.shop_id,
        computeOpenState(
          { is_open: h.is_open, open_time: h.open_time, close_time: h.close_time },
          now.timeHHMM,
        ),
      );
    }
  }

  const shopsByCategory = new Map<string, PublicShop[]>();
  for (const s of shopRows) {
    const list = shopsByCategory.get(s.category_id) ?? [];
    list.push({
      id: s.id,
      name: s.name,
      description: s.description,
      address: s.address,
      province: s.province,
      district: s.district,
      subdistrict: s.subdistrict,
      service_duration_minutes: s.service_duration_minutes,
      services: servicesByShop.get(s.id) ?? [],
      openState: openByShop.get(s.id) ?? "unknown",
    });
    shopsByCategory.set(s.category_id, list);
  }

  return (categoriesResult.data ?? [])
    .map((c) => ({
      category: { id: c.id, name: c.name, icon: c.icon },
      shops: shopsByCategory.get(c.id) ?? [],
    }))
    .filter((group) => group.shops.length > 0);
}

// ----- Public read: registration form -------------------------------------

/**
 * Lists categories visible on the public registration form.
 * Separated so the page component depends on a small focused interface,
 * not on Supabase query shape (ISP + DIP).
 */
export async function listActiveCategories(): Promise<CategoryOption[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}

// ----- Public write: shop registration ------------------------------------

/**
 * Shop registration service.
 *
 * SRP: the only thing this function does is write a shop row in pending state
 * and surface domain errors as a typed result. It does not parse HTTP form
 * data, set cookies, or redirect — those concerns belong in the server action.
 * DIP: callers depend on this interface, not on Supabase directly.
 */
export async function createShop(input: CreateShopInput): Promise<CreateShopResult> {
  const supabase = getSupabaseAdmin();

  const { data: category, error: categoryError } = await supabase
    .from("shop_categories")
    .select("id, is_active")
    .eq("id", input.categoryId)
    .maybeSingle();

  if (categoryError) {
    return { ok: false, code: "unknown", message: categoryError.message };
  }
  if (!category || !category.is_active) {
    return {
      ok: false,
      code: "category_not_found",
      message: "หมวดหมู่ที่เลือกไม่มีอยู่หรือถูกปิดไว้",
    };
  }

  // owner_phone is the shop's login key (findApprovedShopByPhone), so it must
  // be unique among live shops — two shops on one phone would make shop login
  // ambiguous. Block re-use unless the prior shop was rejected (those owners
  // may legitimately re-apply). App-level guard; the DB 23505 path below is the
  // race backstop if a unique index is added later.
  const { data: phoneOwner, error: phoneError } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_phone", input.ownerPhone)
    .neq("status", "rejected")
    .limit(1)
    .maybeSingle();

  if (phoneError) {
    return { ok: false, code: "unknown", message: phoneError.message };
  }
  if (phoneOwner) {
    return {
      ok: false,
      code: "duplicate",
      message: "เบอร์โทรนี้ถูกใช้สมัครร้านในระบบแล้ว",
    };
  }

  const { data, error } = await supabase
    .from("shops")
    .insert({
      name: input.name,
      category_id: input.categoryId,
      description: input.description || null,
      address: input.address || null,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      contact_phone: input.contactPhone || null,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      owner_email: input.ownerEmail || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "ข้อมูลนี้ถูกใช้ลงทะเบียนไว้แล้ว",
      };
    }
    return { ok: false, code: "unknown", message: error.message };
  }

  return { ok: true, id: data.id };
}

// ----- Admin read: list + counts ------------------------------------------

type ShopRow = {
  id: string;
  name: string;
  status: ShopStatus;
  owner_name: string;
  owner_phone: string;
  owner_email: string | null;
  contact_phone: string | null;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  rejection_reason: string | null;
  service_duration_minutes: number;
  created_at: string;
  reviewed_at: string | null;
  shop_categories: { name: string } | null;
};

/**
 * Lists shops for the admin moderation table. The category is joined so the
 * client never has to do an N+1 fetch per row.
 */
export async function listShops(filter?: {
  status?: ShopStatus;
}): Promise<ShopListItem[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("shops")
    .select(
      `
        id, name, status,
        owner_name, owner_phone, owner_email,
        contact_phone, description, address, province, district, subdistrict,
        rejection_reason, service_duration_minutes, created_at, reviewed_at,
        shop_categories ( name )
      `,
    )
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as ShopRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    category_name: r.shop_categories?.name ?? null,
    owner_name: r.owner_name,
    owner_phone: r.owner_phone,
    owner_email: r.owner_email,
    contact_phone: r.contact_phone,
    description: r.description,
    address: r.address,
    province: r.province,
    district: r.district,
    subdistrict: r.subdistrict,
    rejection_reason: r.rejection_reason,
    service_duration_minutes: r.service_duration_minutes,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
  }));
}

// ----- Read: admin new-registration notifications -------------------------

export type NewPendingShopAlert = {
  id: string;
  name: string;
  ownerName: string;
  /** จังหวัด, may be null for legacy rows. */
  province: string | null;
  createdAt: string; // UTC ISO
};

/**
 * List shops still awaiting moderation that were registered strictly after
 * `sinceIso`. Backs the admin's live "new registration" notifier, which polls
 * this on a short interval with a server-supplied cursor.
 *
 * SRP: a thin "what registered since T?" read — no UI shaping, no side effects.
 * `.gt` (strict) pairs with the caller advancing its cursor to the server's
 * current time each tick, so a row is never emitted twice on the boundary.
 * Only `pending` rows count — a shop approved/rejected in the same window is no
 * longer actionable and must not ping. Capped at 20 to bound a burst.
 */
export async function listNewPendingShops(
  sinceIso: string,
): Promise<NewPendingShopAlert[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("id, name, owner_name, province, created_at")
    .eq("status", "pending")
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error || !data) return [];
  return (
    data as {
      id: string;
      name: string;
      owner_name: string;
      province: string | null;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    ownerName: r.owner_name,
    province: r.province,
    createdAt: r.created_at,
  }));
}

/**
 * One round-trip count grouped by status, for tab badges on the moderation page.
 * Falls back to zeros on error so the UI still renders.
 */
export async function countShopsByStatus(): Promise<ShopCountsByStatus> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("status", { count: "exact" });

  const zero: ShopCountsByStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  };
  if (error || !data) return zero;

  for (const row of data) {
    const status = (row as { status: ShopStatus }).status;
    if (status in zero) zero[status] += 1;
  }
  return zero;
}

// ----- Admin write: moderation --------------------------------------------

/**
 * Approve a pending shop. Idempotent only when the shop is in `pending`;
 * rejecting an already-approved shop returns an `invalid_transition`.
 */
export async function approveShop(
  id: string,
  reviewerAdminId: string,
): Promise<ModerationResult> {
  return updateShopStatus({
    id,
    reviewerAdminId,
    targetStatus: "approved",
    allowedFrom: ["pending", "rejected", "suspended"],
    rejectionReason: null,
  });
}

/**
 * Reject a pending shop with a reason that becomes visible to the owner.
 */
export async function rejectShop(
  id: string,
  reviewerAdminId: string,
  reason: string,
): Promise<ModerationResult> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "invalid_transition",
      message: "ต้องระบุเหตุผลเมื่อปฏิเสธ",
    };
  }
  return updateShopStatus({
    id,
    reviewerAdminId,
    targetStatus: "rejected",
    allowedFrom: ["pending", "approved"],
    rejectionReason: trimmed,
  });
}

async function updateShopStatus(args: {
  id: string;
  reviewerAdminId: string;
  targetStatus: ShopStatus;
  allowedFrom: ShopStatus[];
  rejectionReason: string | null;
}): Promise<ModerationResult> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from("shops")
    .select("status")
    .eq("id", args.id)
    .maybeSingle();

  if (readError) {
    return { ok: false, code: "unknown", message: readError.message };
  }
  if (!existing) {
    return { ok: false, code: "not_found", message: "ไม่พบร้านในระบบ" };
  }

  const currentStatus = (existing as { status: ShopStatus }).status;
  if (!args.allowedFrom.includes(currentStatus)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `ร้านนี้อยู่ในสถานะ "${currentStatus}" ไม่สามารถเปลี่ยนเป็น "${args.targetStatus}" ได้`,
    };
  }

  const { error: updateError } = await supabase
    .from("shops")
    .update({
      status: args.targetStatus,
      rejection_reason: args.rejectionReason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: args.reviewerAdminId,
    })
    .eq("id", args.id);

  if (updateError) {
    return { ok: false, code: "unknown", message: updateError.message };
  }

  return { ok: true };
}

// ----- Admin write: edit shop profile -------------------------------------

/**
 * Admin-side update of shop fields. Does not touch `status` — that's owned
 * by the moderation flow (approveShop / rejectShop).
 *
 * Stamps `reviewed_by` with the editing admin so we have an audit trail of
 * the most recent admin touch; `reviewed_at` is NOT updated because that
 * field tracks moderation decisions, not edits.
 */
export async function updateShop(
  id: string,
  input: UpdateShopInput,
  editorAdminId: string,
): Promise<UpdateShopResult> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from("shops")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    return { ok: false, code: "unknown", message: readError.message };
  }
  if (!existing) {
    return { ok: false, code: "not_found", message: "ไม่พบร้านในระบบ" };
  }

  const { data: category, error: categoryError } = await supabase
    .from("shop_categories")
    .select("id, is_active")
    .eq("id", input.categoryId)
    .maybeSingle();
  if (categoryError) {
    return { ok: false, code: "unknown", message: categoryError.message };
  }
  if (!category) {
    return {
      ok: false,
      code: "category_not_found",
      message: "หมวดหมู่ที่เลือกไม่มีอยู่ในระบบ",
    };
  }

  const { error: updateError } = await supabase
    .from("shops")
    .update({
      name: input.name,
      category_id: input.categoryId,
      description: input.description || null,
      address: input.address || null,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      contact_phone: input.contactPhone || null,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      owner_email: input.ownerEmail || null,
      reviewed_by: editorAdminId,
    })
    .eq("id", id);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "ข้อมูลนี้ขัดแย้งกับร้านอื่นในระบบ",
      };
    }
    return { ok: false, code: "unknown", message: updateError.message };
  }

  return { ok: true };
}

// ----- Shop fetch by id ---------------------------------------------------

/**
 * Read a single shop by id, projected into the same shape as the admin list
 * so the same `ShopListItem` consumers (cards, forms) can render it.
 *
 * Used by both the admin detail flows and the shop-owner profile page.
 */
export async function getShopById(id: string): Promise<ShopListItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select(
      `
        id, name, status,
        owner_name, owner_phone, owner_email,
        contact_phone, description, address, province, district, subdistrict,
        rejection_reason, service_duration_minutes, created_at, reviewed_at,
        shop_categories ( name )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as unknown as ShopRow;
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    category_name: r.shop_categories?.name ?? null,
    owner_name: r.owner_name,
    owner_phone: r.owner_phone,
    owner_email: r.owner_email,
    contact_phone: r.contact_phone,
    description: r.description,
    address: r.address,
    province: r.province,
    district: r.district,
    subdistrict: r.subdistrict,
    rejection_reason: r.rejection_reason,
    service_duration_minutes: r.service_duration_minutes,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
  };
}

// ----- Shop category reference --------------------------------------------

export type ShopCategoryRef = { id: string; name: string };

/**
 * The category a shop belongs to (id + name). For surfaces that need to look
 * up category-scoped data — e.g. the shop-owner services page offering the
 * service presets curated for that category. Returns null if the shop or its
 * category can't be found.
 */
export async function getShopCategoryRef(
  shopId: string,
): Promise<ShopCategoryRef | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("shop_categories ( id, name )")
    .eq("id", shopId)
    .maybeSingle();

  if (error || !data) return null;
  const cat = (
    data as unknown as { shop_categories: { id: string; name: string } | null }
  ).shop_categories;
  if (!cat) return null;
  return { id: cat.id, name: cat.name };
}

// ----- Shop-owner self-edit -----------------------------------------------

export type UpdateOwnShopInput = Omit<UpdateShopInput, "ownerPhone">;

/**
 * Shop-owner update of their own profile. Deliberately narrower than the
 * admin `updateShop`: owner_phone (the login key) and status (the moderation
 * state) are NOT exposed here. Changing the login phone requires admin
 * assistance; status only transitions through approve/reject.
 *
 * SRP: profile fields only. Auth (verifying the caller owns this shop)
 * happens in the server action layer.
 */
export async function updateOwnShopProfile(
  shopId: string,
  input: UpdateOwnShopInput,
): Promise<UpdateShopResult> {
  const supabase = getSupabaseAdmin();

  const { data: category, error: categoryError } = await supabase
    .from("shop_categories")
    .select("id, is_active")
    .eq("id", input.categoryId)
    .maybeSingle();
  if (categoryError) {
    return { ok: false, code: "unknown", message: categoryError.message };
  }
  if (!category) {
    return {
      ok: false,
      code: "category_not_found",
      message: "หมวดหมู่ที่เลือกไม่มีอยู่ในระบบ",
    };
  }

  const { error: updateError } = await supabase
    .from("shops")
    .update({
      name: input.name,
      category_id: input.categoryId,
      description: input.description || null,
      address: input.address || null,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      contact_phone: input.contactPhone || null,
      owner_name: input.ownerName,
      owner_email: input.ownerEmail || null,
    })
    .eq("id", shopId);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "ข้อมูลนี้ขัดแย้งกับร้านอื่นในระบบ",
      };
    }
    return { ok: false, code: "unknown", message: updateError.message };
  }

  return { ok: true };
}

// ----- Shop owner authentication ------------------------------------------

/**
 * Step 1 of shop login: look up an APPROVED shop by phone.
 * Returns a minimal login descriptor — never the PIN hash itself.
 * Returning `null` for both "shop doesn't exist" and "shop not approved"
 * keeps the login flow from leaking which case is which.
 */
export async function findApprovedShopByPhone(
  phone: string,
): Promise<ShopLoginInfo | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("id, name, owner_phone, pin_hash")
    .eq("owner_phone", phone)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    phone: data.owner_phone,
    hasPin: data.pin_hash !== null,
  };
}

/**
 * First-time PIN setup. Fails if a PIN is already on file — to change a
 * PIN later we'll add a separate reset flow rather than overwriting silently.
 */
export async function setShopPin(
  shopId: string,
  pin: string,
): Promise<PinResult> {
  if (!PIN_RE.test(pin)) {
    return {
      ok: false,
      code: "bad_pin",
      message: `รหัส PIN ต้องเป็นตัวเลข ${PIN_LENGTH} หลัก`,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("shops")
    .select("pin_hash, status")
    .eq("id", shopId)
    .maybeSingle();
  if (readError) {
    console.error("setShopPin read error:", readError);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  if (!existing || existing.status !== "approved") {
    return { ok: false, code: "not_found", message: "ไม่พบร้านในระบบ" };
  }
  if (existing.pin_hash) {
    return {
      ok: false,
      code: "pin_already_set",
      message: "รหัส PIN ถูกตั้งไว้แล้ว",
    };
  }

  const hash = await hashPassword(pin);
  const { error: updateError } = await supabase
    .from("shops")
    .update({ pin_hash: hash })
    .eq("id", shopId);
  if (updateError) {
    console.error("setShopPin update error:", updateError);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

/**
 * Verify the entered PIN against the stored hash. Returns a generic
 * "bad_pin" on mismatch — no distinction between "PIN wrong" and "PIN not
 * set" — to limit information leakage.
 */
export async function verifyShopPin(
  shopId: string,
  pin: string,
): Promise<PinResult> {
  if (!PIN_RE.test(pin)) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("pin_hash, status, failed_pin_attempts, locked_until")
    .eq("id", shopId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }

  const lockTarget = {
    table: "shops",
    counter: "failed_pin_attempts",
  } as const;

  // (a) Currently locked → reject before touching the PIN hash at all.
  if (data.locked_until) {
    const lockedUntil = new Date(data.locked_until as string);
    if (lockedUntil.getTime() > Date.now()) {
      return { ok: false, code: "locked", message: lockedMessage(lockedUntil) };
    }
  }

  if (data.status !== "approved" || !data.pin_hash) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }

  // (b) Verify the PIN.
  const ok = await verifyPassword(pin, data.pin_hash);

  // (c) Wrong PIN → register the failed attempt atomically (compare-and-swap,
  // so concurrent guesses can't race past the lock).
  if (!ok) {
    const lockedUntil = await registerFailedAttempt(
      lockTarget,
      shopId,
      (data.failed_pin_attempts as number | null) ?? 0,
    );
    if (lockedUntil) {
      return { ok: false, code: "locked", message: lockedMessage(lockedUntil) };
    }
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }

  // (d) Success → clear the counter and any stale lock.
  await clearFailedAttempts(lockTarget, shopId);
  return { ok: true };
}

/**
 * Change an approved shop's PIN: verify the current PIN, then store a hash of
 * the new one. `shopId` MUST come from the verified session so a shop can only
 * change its own PIN. Wrong current PIN surfaces as `bad_pin`.
 */
export async function changeShopPin(
  shopId: string,
  currentPin: string,
  newPin: string,
): Promise<PinResult> {
  if (!PIN_RE.test(newPin)) {
    return {
      ok: false,
      code: "bad_pin",
      message: `รหัส PIN ต้องเป็นตัวเลข ${PIN_LENGTH} หลัก`,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("pin_hash, status")
    .eq("id", shopId)
    .maybeSingle();

  if (error) {
    console.error("changeShopPin read error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  if (!data || data.status !== "approved" || !data.pin_hash) {
    return { ok: false, code: "not_found", message: "ไม่พบร้านในระบบ" };
  }

  const ok = await verifyPassword(currentPin, data.pin_hash);
  if (!ok) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN เดิมไม่ถูกต้อง" };
  }

  const hash = await hashPassword(newPin);
  const { error: updateError } = await supabase
    .from("shops")
    .update({ pin_hash: hash })
    .eq("id", shopId);

  if (updateError) {
    console.error("changeShopPin update error:", updateError);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

// NOTE: the shop-level `service_duration_minutes` is no longer owner-editable.
// It is seeded by the column default at registration and read only as a
// booking fallback for shops that haven't built a per-service catalogue
// (see getBookingContext). The per-service catalogue (shop_services) is the
// source of truth for durations everywhere customer-facing.
