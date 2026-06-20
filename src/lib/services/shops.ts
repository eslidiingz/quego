import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { lockedMessage, remainingAttemptsMessage } from "@/lib/auth/lockout";
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
import {
  getRatingSummariesForShops,
  type ShopRatingSummary,
} from "@/lib/services/reviews";
import {
  slugify,
  isValidHandleFormat,
  isReservedHandle,
  HANDLE_MAX_LENGTH,
} from "@/lib/slug";
import { isUuid } from "@/lib/validation/uuid";
import { putObject, deleteObject } from "@/lib/r2/client";
import {
  validateImageFile,
  MAX_LOGO_BYTES,
  MAX_COVER_BYTES,
} from "@/lib/validation/media";

// ----- Types --------------------------------------------------------------

/**
 * Lifecycle state of a shop row. Registration is fully self-serve — `createShop`
 * only ever writes `"approved"`, and there is no admin moderation, so the app
 * never produces any other value going forward. The union is deliberately kept
 * as the historical superset purely for DB-READ typing: the live database still
 * holds legacy `"rejected"` rows from the old moderation era, and public/login
 * queries keep an `.eq("status","approved")` guard so those legacy rows can
 * never surface or log in. Narrowing this to `"approved"` alone would make those
 * read-side guards (and the legacy rows they protect against) untypable.
 */
export type ShopStatus = "approved" | "rejected";

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

export type CreateShopInput = {
  name: string;
  categoryId: string;
  /** Public URL handle. Optional: auto-generated from the name when omitted. */
  handle?: string;
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

/** Which unique field clashed, so the form can flag the right input inline. */
export type ShopDuplicateField =
  | "ownerPhone"
  | "contactPhone"
  | "ownerEmail"
  | "handle";

export type CreateShopResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "category_not_found" | "duplicate" | "unknown";
      message: string;
      /** Set only when `code === "duplicate"`. */
      field?: ShopDuplicateField;
    };

export type ShopListItem = {
  id: string;
  name: string;
  /** Public URL handle; null only for legacy non-approved rows. */
  handle: string | null;
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
  /**
   * OPP-04: hours before a slot a customer may still reschedule/cancel (0 = no
   * restriction). Optional because only `getShopById` (the profile page) selects
   * it; the admin list projections leave it undefined.
   */
  reschedule_cancel_cutoff_hours?: number;
  /** R2 object key for the shop logo/avatar (1:1). NULL = none → icon fallback. */
  logo_key: string | null;
  /** R2 object key for the shop cover/banner (~8:3). NULL = none → gradient fallback. */
  cover_key: string | null;
};

export type UpdateShopInput = CreateShopInput;

export type UpdateShopResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_found" | "category_not_found" | "duplicate" | "unknown";
      message: string;
      /** Set only when the clash/invalid value is the public URL handle. */
      field?: "handle";
    };

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
  /** Public URL handle — the canonical segment the detail page redirects to. */
  handle: string | null;
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
  /** R2 object key for the shop logo/avatar (1:1). NULL = none → icon fallback. */
  logo_key: string | null;
  /** R2 object key for the shop cover/banner (~8:3). NULL = none → gradient fallback. */
  cover_key: string | null;
};

type ShopDetailRow = {
  id: string;
  name: string;
  handle: string | null;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  contact_phone: string | null;
  service_duration_minutes: number;
  logo_key: string | null;
  cover_key: string | null;
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
export async function getPublicShopByHandleOrId(
  param: string,
): Promise<PublicShopDetail | null> {
  const supabase = getSupabaseAdmin();

  // `param` is the URL segment: either a custom handle or a raw UUID (legacy
  // links / QR codes predate handles). Match the right column for each.
  const base = supabase
    .from("shops")
    .select(
      `
        id, name, handle, description, address, province, district, subdistrict, contact_phone, service_duration_minutes, logo_key, cover_key,
        shop_categories ( id, name, icon )
      `,
    )
    .eq("status", "approved");
  const { data: shopData, error: shopError } = await (
    isUuid(param) ? base.eq("id", param) : base.eq("handle", param)
  ).maybeSingle();

  if (shopError || !shopData) return null;
  const row = shopData as unknown as ShopDetailRow;

  const [{ data: hoursData }, services] = await Promise.all([
    supabase
      .from("shop_business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("shop_id", row.id),
    listActiveServicesByShop(row.id),
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
    handle: row.handle,
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
    logo_key: row.logo_key,
    cover_key: row.cover_key,
  };
}

/**
 * Resolve a public URL segment (handle or UUID) to a shop's canonical UUID, for
 * approved shops only. Lightweight companion to
 * {@link getPublicShopByHandleOrId} for routes that already have heavier
 * id-keyed loaders (the booking/walk-in pages call `getBookingContext(uuid)`).
 * Returns null when no approved shop matches.
 */
export async function resolveApprovedShopId(
  param: string,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const base = supabase.from("shops").select("id").eq("status", "approved");
  const { data, error } = await (
    isUuid(param) ? base.eq("id", param) : base.eq("handle", param)
  ).maybeSingle();
  if (error || !data) return null;
  return data.id;
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
  /** Public URL handle for the card link; null only for legacy rows. */
  handle: string | null;
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
  /** Aggregate star rating from completed-booking reviews. */
  rating: ShopRatingSummary;
  /** R2 object key for the shop logo/avatar (1:1). NULL = none → icon fallback. */
  logo_key: string | null;
  /** R2 object key for the shop cover/banner (~8:3). NULL = none → gradient fallback. */
  cover_key: string | null;
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
        "id, name, handle, description, address, province, district, subdistrict, service_duration_minutes, category_id, logo_key, cover_key",
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
  let ratingByShop = new Map<string, ShopRatingSummary>();
  const shopIds = shopRows.map((s) => s.id);
  if (shopIds.length > 0) {
    // Today's hours + every shop's active services + rating aggregates in
    // three parallel batched queries — the card needs all three, and N+1
    // per shop would be wasteful.
    const [hoursResult, services, ratings] = await Promise.all([
      supabase
        .from("shop_business_hours")
        .select("shop_id, is_open, open_time, close_time")
        .in("shop_id", shopIds)
        .eq("day_of_week", now.dayOfWeek),
      listActiveServicesForShops(shopIds),
      getRatingSummariesForShops(shopIds),
    ]);
    servicesByShop = services;
    ratingByShop = ratings;
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
      handle: s.handle,
      description: s.description,
      address: s.address,
      province: s.province,
      district: s.district,
      subdistrict: s.subdistrict,
      service_duration_minutes: s.service_duration_minutes,
      services: servicesByShop.get(s.id) ?? [],
      openState: openByShop.get(s.id) ?? "unknown",
      rating: ratingByShop.get(s.id) ?? { average: 0, count: 0 },
      logo_key: s.logo_key,
      cover_key: s.cover_key,
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
    .select("id, name, slug")
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
 * SRP: the only thing this function does is write a shop row (live/approved on
 * creation — registration is self-serve, no admin approval gate) and surface
 * domain errors as a typed result. It does not parse HTTP form
 * data, set cookies, or redirect — those concerns belong in the server action.
 * DIP: callers depend on this interface, not on Supabase directly.
 */
async function generateUniqueHandle(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  seed: string,
): Promise<string> {
  // Romanised base from the shop name; pure-Thai names slugify to "" → "ran".
  let base = slugify(seed).slice(0, 20).replace(/-+$/u, "");
  if (!isValidHandleFormat(base) || isReservedHandle(base)) base = "ran";
  // Probe base, then base-2, base-3, … skipping any reserved/invalid candidate.
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    if (!isValidHandleFormat(candidate) || isReservedHandle(candidate)) continue;
    const { data } = await supabase
      .from("shops")
      .select("id")
      .eq("handle", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Pathological fallback; the partial unique index is the final race backstop.
  return `${base}-${Date.now().toString(36)}`.slice(0, HANDLE_MAX_LENGTH);
}

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

  // Email is identity-insensitive to case ("A@x.com" == "a@x.com"), so normalise
  // before checking + storing; the unique index is on the stored (lowercased)
  // value, keeping the app check and the DB backstop in agreement.
  const ownerEmail = input.ownerEmail ? input.ownerEmail.toLowerCase() : undefined;

  // Uniqueness guards among live shops. owner_phone is the login key
  // (findShopByOwnerPhone); contact_phone and owner_email must also be unique so
  // a number/email can't be claimed by two shops. Each is checked within its OWN
  // column only — a shop may legitimately reuse its owner_phone as its
  // contact_phone, so we never cross-check columns.
  //
  // The `.neq("status","rejected")` below is now purely a LEGACY concern: the
  // moderation era is gone and nothing creates `rejected` rows anymore, but the
  // live DB still holds old `rejected` tombstones. Excluding them means an owner
  // whose shop was rejected under the old flow isn't permanently locked out of
  // self-serve registration. App-level guards; the partial unique indexes are
  // the race backstop (23505 → mapped below).
  const dupChecks: ReadonlyArray<{
    column: "owner_phone" | "contact_phone" | "owner_email";
    value: string;
    field: ShopDuplicateField;
    message: string;
  }> = [
    {
      column: "owner_phone",
      value: input.ownerPhone,
      field: "ownerPhone",
      message: "เบอร์โทรนี้ถูกใช้สมัครร้านในระบบแล้ว",
    },
    ...(input.contactPhone
      ? ([
          {
            column: "contact_phone" as const,
            value: input.contactPhone,
            field: "contactPhone" as const,
            message: "เบอร์โทรร้านนี้ถูกใช้กับร้านอื่นในระบบแล้ว",
          },
        ] as const)
      : []),
    ...(ownerEmail
      ? ([
          {
            column: "owner_email" as const,
            value: ownerEmail,
            field: "ownerEmail" as const,
            message: "อีเมลนี้ถูกใช้กับร้านอื่นในระบบแล้ว",
          },
        ] as const)
      : []),
  ];

  for (const check of dupChecks) {
    const { data: clash, error: clashError } = await supabase
      .from("shops")
      .select("id")
      .eq(check.column, check.value)
      .neq("status", "rejected")
      .limit(1)
      .maybeSingle();

    if (clashError) {
      return { ok: false, code: "unknown", message: clashError.message };
    }
    if (clash) {
      return {
        ok: false,
        code: "duplicate",
        field: check.field,
        message: check.message,
      };
    }
  }

  // Resolve the public URL handle: use the (validated) one the owner picked, or
  // auto-generate a unique one from the shop name when they left it blank. A
  // tampered/invalid value (the form validates shape upstream) is treated as
  // "blank" rather than persisted malformed.
  let handle = input.handle?.trim().toLowerCase() ?? "";
  if (handle && (!isValidHandleFormat(handle) || isReservedHandle(handle))) {
    handle = "";
  }
  if (handle) {
    const { data: handleClash } = await supabase
      .from("shops")
      .select("id")
      .eq("handle", handle)
      .limit(1)
      .maybeSingle();
    if (handleClash) {
      return {
        ok: false,
        code: "duplicate",
        field: "handle",
        message: "ลิงก์ร้านนี้ถูกใช้แล้ว กรุณาเลือกคำอื่น",
      };
    }
  } else {
    handle = await generateUniqueHandle(supabase, input.name);
  }

  const { data, error } = await supabase
    .from("shops")
    .insert({
      // Self-serve registration: a shop is live the moment it's created (no admin
      // approval step). OTP-proven phone ownership is the gate, enforced upstream.
      status: "approved",
      name: input.name,
      handle,
      category_id: input.categoryId,
      description: input.description || null,
      address: input.address || null,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      contact_phone: input.contactPhone || null,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      owner_email: ownerEmail ?? null,
      // Audit: the owner proved this phone via Firebase OTP at registration.
      // The action gates on isPhoneVerified before reaching here, so by the time
      // we insert, ownership has been established. Absolute UTC instant, matching
      // the reviewed_at convention.
      phone_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Race backstop: map the violated index back to its field for an inline
      // error, falling back to owner_phone (the only always-present unique col).
      const detail = `${error.message} ${error.details ?? ""}`;
      const field: ShopDuplicateField = detail.includes("handle")
        ? "handle"
        : detail.includes("contact_phone")
          ? "contactPhone"
          : detail.includes("owner_email")
            ? "ownerEmail"
            : "ownerPhone";
      const message =
        field === "handle"
          ? "ลิงก์ร้านนี้ถูกใช้แล้ว กรุณาเลือกคำอื่น"
          : field === "contactPhone"
            ? "เบอร์โทรร้านนี้ถูกใช้กับร้านอื่นในระบบแล้ว"
            : field === "ownerEmail"
              ? "อีเมลนี้ถูกใช้กับร้านอื่นในระบบแล้ว"
              : "เบอร์โทรนี้ถูกใช้สมัครร้านในระบบแล้ว";
      return { ok: false, code: "duplicate", field, message };
    }
    return { ok: false, code: "unknown", message: error.message };
  }

  return { ok: true, id: data.id };
}

// ----- Admin read: list + counts ------------------------------------------

type ShopRow = {
  id: string;
  name: string;
  handle: string | null;
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
  reschedule_cancel_cutoff_hours: number;
  logo_key: string | null;
  cover_key: string | null;
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
        id, name, handle, status,
        owner_name, owner_phone, owner_email,
        contact_phone, description, address, province, district, subdistrict,
        rejection_reason, service_duration_minutes, created_at, reviewed_at,
        reschedule_cancel_cutoff_hours, logo_key, cover_key,
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
    handle: r.handle,
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
    reschedule_cancel_cutoff_hours: r.reschedule_cancel_cutoff_hours,
    logo_key: r.logo_key,
    cover_key: r.cover_key,
  }));
}

// ----- Admin write: edit shop profile -------------------------------------

/**
 * Admin-side update of shop fields. Does not touch `status` — registration is
 * self-serve and there is no moderation flow, so `status` is never edited.
 *
 * Stamps `reviewed_by` with the editing admin so we have an audit trail of
 * the most recent admin touch.
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
        id, name, handle, status,
        owner_name, owner_phone, owner_email,
        contact_phone, description, address, province, district, subdistrict,
        rejection_reason, service_duration_minutes, created_at, reviewed_at,
        reschedule_cancel_cutoff_hours, logo_key, cover_key,
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
    handle: r.handle,
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
    reschedule_cancel_cutoff_hours: r.reschedule_cancel_cutoff_hours,
    logo_key: r.logo_key,
    cover_key: r.cover_key,
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

export type UpdateOwnShopInput = Omit<UpdateShopInput, "ownerPhone"> & {
  /** Public URL handle — required on edit (every live shop already has one). */
  handle: string;
  /** OPP-04: hours before a slot a customer may still reschedule/cancel (0–168). */
  rescheduleCancelCutoffHours: number;
};

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

  // Public URL handle: validated upstream by the profile action; re-checked here
  // as a backstop. Uniqueness excludes this shop's own row so re-saving an
  // unchanged handle is a no-op, not a self-collision.
  const handle = input.handle.trim().toLowerCase();
  if (!isValidHandleFormat(handle) || isReservedHandle(handle)) {
    return {
      ok: false,
      code: "unknown",
      message: "ลิงก์ร้านไม่ถูกต้อง",
      field: "handle",
    };
  }
  const { data: handleClash } = await supabase
    .from("shops")
    .select("id")
    .eq("handle", handle)
    .neq("id", shopId)
    .limit(1)
    .maybeSingle();
  if (handleClash) {
    return {
      ok: false,
      code: "duplicate",
      field: "handle",
      message: "ลิงก์ร้านนี้ถูกใช้แล้ว กรุณาเลือกคำอื่น",
    };
  }

  const { error: updateError } = await supabase
    .from("shops")
    .update({
      name: input.name,
      handle,
      category_id: input.categoryId,
      description: input.description || null,
      address: input.address || null,
      province: input.province,
      district: input.district,
      subdistrict: input.subdistrict,
      contact_phone: input.contactPhone || null,
      owner_name: input.ownerName,
      owner_email: input.ownerEmail || null,
      reschedule_cancel_cutoff_hours: input.rescheduleCancelCutoffHours,
    })
    .eq("id", shopId);

  if (updateError) {
    if (updateError.code === "23505") {
      const detail = `${updateError.message} ${updateError.details ?? ""}`;
      if (detail.includes("handle")) {
        return {
          ok: false,
          code: "duplicate",
          field: "handle",
          message: "ลิงก์ร้านนี้ถูกใช้แล้ว กรุณาเลือกคำอื่น",
        };
      }
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
 * Step 1 of shop login: look up a shop by its owner phone. Keeps an
 * `.eq("status","approved")` guard so a legacy non-approved row (e.g. an old
 * `rejected` tombstone) can never log in. Returns a minimal login descriptor —
 * never the PIN hash itself. Returning `null` for both "no such shop" and "not
 * approved" keeps the login flow from leaking which case is which.
 */
export async function findShopByOwnerPhone(
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
  // If the lock has expired, reset the counter so the user gets a fresh 5
  // attempts rather than re-locking immediately on the first wrong guess.
  let knownAttempts = (data.failed_pin_attempts as number | null) ?? 0;
  if (data.locked_until) {
    const lockedUntil = new Date(data.locked_until as string);
    if (lockedUntil.getTime() > Date.now()) {
      return { ok: false, code: "locked", message: lockedMessage(lockedUntil) };
    }
    await clearFailedAttempts(lockTarget, shopId);
    knownAttempts = 0;
  }

  if (data.status !== "approved" || !data.pin_hash) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }

  // (b) Verify the PIN.
  const ok = await verifyPassword(pin, data.pin_hash);

  // (c) Wrong PIN → register the failed attempt atomically (compare-and-swap,
  // so concurrent guesses can't race past the lock).
  if (!ok) {
    const { lockedUntil, newAttempts } = await registerFailedAttempt(
      lockTarget,
      shopId,
      knownAttempts,
    );
    if (lockedUntil) {
      return { ok: false, code: "locked", message: lockedMessage(lockedUntil) };
    }
    const warning = remainingAttemptsMessage(newAttempts);
    const message = warning
      ? `รหัส PIN ไม่ถูกต้อง — ${warning}`
      : "รหัส PIN ไม่ถูกต้อง";
    return { ok: false, code: "bad_pin", message };
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

// ----- Shop images (logo + cover) -----------------------------------------

/** Which image slot a shop-image mutation targets. */
export type ShopImageSlot = "logo" | "cover";

const IMAGE_COLUMN: Record<ShopImageSlot, "logo_key" | "cover_key"> = {
  logo: "logo_key",
  cover: "cover_key",
};

const IMAGE_MAX_BYTES: Record<ShopImageSlot, number> = {
  logo: MAX_LOGO_BYTES,
  cover: MAX_COVER_BYTES,
};

/**
 * Upload a shop's logo/cover to R2 and point the row's `{slot}_key` at it.
 *
 * SRP: validate → PUT new object → update row → best-effort delete of the
 * previous object. Ownership is enforced by the caller passing a `shopId` from
 * the verified session plus the `.eq("id", shopId)` filter here — a shop can
 * never touch another's row (same idiom as updateOwnShopProfile). Order matters:
 * PUT-new, then update-row, then delete-old, so a mid-flight failure leaves a
 * harmless orphan object rather than a row pointing at a deleted key. Each
 * replace mints a fresh timestamped key, so the CDN never serves a stale image.
 * Errors surface as generic Thai messages — raw R2/DB detail is never leaked.
 */
async function setShopImage(
  shopId: string,
  slot: ShopImageSlot,
  file: File,
): Promise<UpdateShopResult> {
  const column = IMAGE_COLUMN[slot];
  const validation = await validateImageFile(file, {
    maxBytes: IMAGE_MAX_BYTES[slot],
  });
  if (!validation.ok) {
    return { ok: false, code: "unknown", message: validation.message };
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("shops")
    .select(`id, ${column}`)
    .eq("id", shopId)
    .maybeSingle();
  if (readError) {
    return { ok: false, code: "unknown", message: readError.message };
  }
  if (!existing) {
    return { ok: false, code: "not_found", message: "ไม่พบร้านในระบบ" };
  }
  const previousKey =
    (existing as Record<string, string | null>)[column] ?? null;

  const key = `shops/${shopId}/${slot}-${Date.now()}.${validation.ext}`;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putObject(key, bytes, validation.mime);
  } catch (error) {
    console.error("setShopImage put error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    };
  }

  const { error: updateError } = await supabase
    .from("shops")
    .update({ [column]: key })
    .eq("id", shopId);
  if (updateError) {
    // Row didn't take the new key — drop the just-uploaded orphan so storage
    // doesn't leak, then report a generic failure.
    await deleteObject(key).catch(() => {});
    console.error("setShopImage update error:", updateError);
    return {
      ok: false,
      code: "unknown",
      message: "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    };
  }

  if (previousKey && previousKey !== key) {
    await deleteObject(previousKey).catch(() => {});
  }
  return { ok: true };
}

/** Set the shop's logo (1:1 avatar). See {@link setShopImage}. */
export async function setShopLogo(
  shopId: string,
  file: File,
): Promise<UpdateShopResult> {
  return setShopImage(shopId, "logo", file);
}

/** Set the shop's cover banner (~8:3). See {@link setShopImage}. */
export async function setShopCover(
  shopId: string,
  file: File,
): Promise<UpdateShopResult> {
  return setShopImage(shopId, "cover", file);
}

