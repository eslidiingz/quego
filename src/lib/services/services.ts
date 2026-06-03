import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Shop-services (บริการ) service. One shop offers many bookable services
 * (e.g. ตัดผม, ทำสี, ดัดวอลลุ่ม). Each service carries its own duration — which
 * drives slot generation in the booking flow — and an optional price.
 *
 * SRP: CRUD + the reads the booking layer needs (active list + a single
 * booking-time lookup). All access goes through the service-role client (RLS
 * deny-all on `shop_services`), so every authorization decision is made here.
 * Ownership is enforced with a compound `.eq("shop_id", shopId)` filter on
 * every mutation — `shopId` MUST come from the caller's verified session, never
 * from request input, so a shop can only touch its own services even by
 * guessing a service UUID.
 */

// ----- Types --------------------------------------------------------------

export type ShopServiceListItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  isActive: boolean;
  sortOrder: number;
};

export type ShopServiceInput = {
  name: string;
  description?: string | null;
  durationMinutes: number;
  price?: number | null;
  isActive?: boolean;
};

export type ServiceMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "invalid" | "not_found" | "unknown";
      message: string;
    };

/** Minimal service shape the booking flow needs: duration + price snapshot. */
export type BookableService = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
};

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | string | null;
  is_active: boolean;
  sort_order: number;
};

/** Postgres `numeric` arrives over the wire as a string — coerce to number. */
function toPrice(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function mapRow(r: ServiceRow): ShopServiceListItem {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    durationMinutes: r.duration_minutes,
    price: toPrice(r.price),
    isActive: r.is_active,
    sortOrder: r.sort_order,
  };
}

// ----- Read ---------------------------------------------------------------

/**
 * All services for one shop (active and inactive), ordered for the management
 * list. Inactive services are kept so the owner can re-enable them.
 */
export async function listServicesByShop(
  shopId: string,
): Promise<ShopServiceListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_services")
    .select("id, name, description, duration_minutes, price, is_active, sort_order")
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as ServiceRow[]).map(mapRow);
}

/**
 * Active services for one shop, ordered for the customer-facing picker.
 * Returns an empty array for shops that haven't defined any — the booking
 * layer then falls back to a single implicit service from the shop's default
 * `service_duration_minutes`.
 */
export async function listActiveServicesByShop(
  shopId: string,
): Promise<BookableService[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_services")
    .select("id, name, duration_minutes, price")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (
    data as {
      id: string;
      name: string;
      duration_minutes: number;
      price: number | string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    durationMinutes: r.duration_minutes,
    price: toPrice(r.price),
  }));
}

/**
 * Look up one active service for booking-time validation. Ownership is
 * enforced by the compound `id + shop_id` filter, and inactive services are
 * excluded so a stale client can't book a service the shop just disabled.
 * Returns `null` when not found / inactive / wrong shop.
 */
export async function getBookableService(
  shopId: string,
  serviceId: string,
): Promise<BookableService | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_services")
    .select("id, name, duration_minutes, price")
    .eq("id", serviceId)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as {
    id: string;
    name: string;
    duration_minutes: number;
    price: number | string | null;
  };
  return {
    id: r.id,
    name: r.name,
    durationMinutes: r.duration_minutes,
    price: toPrice(r.price),
  };
}

// ----- Write --------------------------------------------------------------

type NormalizedService = {
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
};

/**
 * Server-side backstop normalization. Mirrors the action-layer validator but
 * never trusts it — duration must be a 10-minute multiple in [10, 480] (the
 * same grid the booking slot-math and the DB CHECK enforce) and price, when
 * present, must be a non-negative number.
 */
function normalize(input: ShopServiceInput): NormalizedService | null {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 120) return null;

  const duration = input.durationMinutes;
  if (
    !Number.isInteger(duration) ||
    duration < 10 ||
    duration > 480 ||
    duration % 10 !== 0
  ) {
    return null;
  }

  let price: number | null = null;
  if (input.price != null) {
    if (!Number.isFinite(input.price) || input.price < 0) return null;
    // Two-decimal money — round to cents to match the numeric(10,2) column.
    price = Math.round(input.price * 100) / 100;
  }

  const description = input.description?.trim() || null;
  if (description && description.length > 500) return null;

  return { name, description, durationMinutes: duration, price };
}

/**
 * Add a service. New rows append to the end of the list (sort_order = current
 * service count). Format validation also runs in the action layer; the guard
 * here is the server-side backstop.
 */
export async function createService(
  shopId: string,
  input: ShopServiceInput,
): Promise<ServiceMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลบริการไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from("shop_services")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  const { data, error } = await supabase
    .from("shop_services")
    .insert({
      shop_id: shopId,
      name: fields.name,
      description: fields.description,
      duration_minutes: fields.durationMinutes,
      price: fields.price,
      is_active: input.isActive ?? true,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, code: "unknown", message: error.message };
  }
  return { ok: true, id: data.id as string };
}

/**
 * Update a service's fields. Ownership enforced by the compound `id + shop_id`
 * filter — a mismatch returns zero rows → `not_found`. Changing a service's
 * duration only affects *future* bookings; existing bookings keep their
 * snapshotted `service_duration_minutes`.
 */
export async function updateService(
  shopId: string,
  serviceId: string,
  input: ShopServiceInput,
): Promise<ServiceMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลบริการไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    name: fields.name,
    description: fields.description,
    duration_minutes: fields.durationMinutes,
    price: fields.price,
    updated_at: new Date().toISOString(),
  };
  if (input.isActive !== undefined) update.is_active = input.isActive;

  const { data, error } = await supabase
    .from("shop_services")
    .update(update)
    .eq("id", serviceId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบริการนี้" };
  return { ok: true, id: data.id as string };
}

/**
 * Toggle a service's active state. Disabling hides it from the booking picker
 * immediately but keeps existing bookings intact.
 */
export async function setServiceActive(
  shopId: string,
  serviceId: string,
  isActive: boolean,
): Promise<ServiceMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_services")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบริการนี้" };
  return { ok: true, id: data.id as string };
}

/**
 * Delete a service. Bookings referencing it keep existing — the FK is
 * `on delete set null`, so historical bookings lose the live link but retain
 * their snapshotted `service_name` / `service_price`.
 */
export async function deleteService(
  shopId: string,
  serviceId: string,
): Promise<ServiceMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_services")
    .delete()
    .eq("id", serviceId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบริการนี้" };
  return { ok: true, id: data.id as string };
}
