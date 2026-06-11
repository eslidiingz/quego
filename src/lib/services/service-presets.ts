import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Category service-presets service. Admin-curated building blocks: each shop
 * category (บาร์เบอร์, ร้านนวด, …) carries a list of preset services with a
 * suggested duration + price. A shop owner imports the ones they offer into
 * their own `shop_services` catalogue (see `createServicesFromPresets` in
 * services.ts) — a preset is a *starting point that gets copied*, never a live
 * link, so editing a preset later never disturbs a shop that already imported
 * it.
 *
 * SRP: CRUD over `category_service_presets` plus the reads the admin UI and the
 * shop-import flow need. All access goes through the service-role client (RLS
 * deny-all), so authorization lives in the caller: `requireAdminSession()` for
 * the mutations; the import path constrains reads to the shop's own category.
 * Unlike `shop_services` there is no per-tenant owner — presets are a single
 * global, admin-managed taxonomy keyed by category, so mutations filter by `id`
 * alone (the admin trust domain spans every category).
 */

// ----- Types --------------------------------------------------------------

export type ServicePresetListItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  isActive: boolean;
  sortOrder: number;
};

export type ServicePresetInput = {
  name: string;
  description?: string | null;
  durationMinutes: number;
  price?: number | null;
  isActive?: boolean;
};

export type PresetMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "invalid" | "not_found" | "duplicate" | "unknown";
      message: string;
    };

/** Minimal preset shape the shop-import flow copies into `shop_services`. */
export type ImportablePreset = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
};

type PresetRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | string | null;
  is_active: boolean;
  sort_order: number;
};

const PRESET_COLUMNS =
  "id, category_id, name, description, duration_minutes, price, is_active, sort_order";

/** Postgres `numeric` arrives over the wire as a string — coerce to number. */
export function toPrice(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function mapRow(r: PresetRow): ServicePresetListItem {
  return {
    id: r.id,
    categoryId: r.category_id,
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
 * All presets for one category (active and inactive), ordered for the admin
 * management list. Inactive presets are kept so the admin can re-enable them.
 */
export async function listPresetsByCategory(
  categoryId: string,
): Promise<ServicePresetListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_service_presets")
    .select(PRESET_COLUMNS)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as PresetRow[]).map(mapRow);
}

/**
 * Active presets for one category, ordered for the shop-owner import picker.
 * Returns an empty array for categories with no presets defined yet.
 */
export async function listActivePresetsByCategory(
  categoryId: string,
): Promise<ServicePresetListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_service_presets")
    .select(PRESET_COLUMNS)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as PresetRow[]).map(mapRow);
}

/**
 * Fetch the chosen active presets, constrained to a single category. Used by
 * the shop-import action: `categoryId` comes from the shop's own row and `ids`
 * from the request, so the compound `category_id + id + is_active` filter means
 * a crafted id from another category (or a disabled preset) can't be imported.
 * Ids that don't match are silently dropped.
 */
export async function getActivePresetsByIds(
  categoryId: string,
  ids: string[],
): Promise<ImportablePreset[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_service_presets")
    .select("id, name, description, duration_minutes, price")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .in("id", ids)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (
    data as {
      id: string;
      name: string;
      description: string | null;
      duration_minutes: number;
      price: number | string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    durationMinutes: r.duration_minutes,
    price: toPrice(r.price),
  }));
}

/**
 * Preset counts grouped by category, for the admin tab badges. One round-trip;
 * returns a `categoryId -> count` map (categories with none simply have no key).
 */
export async function countPresetsByCategory(): Promise<Record<string, number>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_service_presets")
    .select("category_id");

  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as { category_id: string }[]) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

// ----- Write --------------------------------------------------------------

type NormalizedPreset = {
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
};

/**
 * Server-side backstop normalization — the same grid `shop_services` and the DB
 * CHECK enforce: duration is a 10-minute multiple in [10, 480] and price, when
 * present, a non-negative two-decimal number. Mirrors the action-layer
 * validator but never trusts it.
 */
export function normalize(input: ServicePresetInput): NormalizedPreset | null {
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
    price = Math.round(input.price * 100) / 100;
  }

  const description = input.description?.trim() || null;
  if (description && description.length > 500) return null;

  return { name, description, durationMinutes: duration, price };
}

/**
 * Add a preset to a category. New rows append to the end (sort_order = current
 * preset count for that category). A duplicate name within the same category
 * trips the partial unique index (Postgres `23505`) → `duplicate`; a bad
 * category id trips the FK (`23503`) → `not_found`.
 */
export async function createPreset(
  categoryId: string,
  input: ServicePresetInput,
  adminId: string,
): Promise<PresetMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลบริการไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from("category_service_presets")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { data, error } = await supabase
    .from("category_service_presets")
    .insert({
      category_id: categoryId,
      name: fields.name,
      description: fields.description,
      duration_minutes: fields.durationMinutes,
      price: fields.price,
      is_active: input.isActive ?? true,
      sort_order: count ?? 0,
      created_by: adminId,
      updated_by: adminId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "มีบริการชื่อนี้ในหมวดนี้อยู่แล้ว",
      };
    }
    if (error.code === "23503") {
      return { ok: false, code: "not_found", message: "ไม่พบหมวดหมู่นี้" };
    }
    return { ok: false, code: "unknown", message: error.message };
  }
  return { ok: true, id: data.id as string };
}

/**
 * Update a preset's fields. A name that collides with another preset in the
 * same category trips the unique index → `duplicate`. Editing a preset never
 * touches `shop_services` rows a shop has already imported from it.
 */
export async function updatePreset(
  presetId: string,
  input: ServicePresetInput,
  adminId: string,
): Promise<PresetMutationResult> {
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
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  };
  if (input.isActive !== undefined) update.is_active = input.isActive;

  const { data, error } = await supabase
    .from("category_service_presets")
    .update(update)
    .eq("id", presetId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "มีบริการชื่อนี้ในหมวดนี้อยู่แล้ว",
      };
    }
    return { ok: false, code: "unknown", message: error.message };
  }
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบริการ preset นี้" };
  return { ok: true, id: data.id as string };
}

/** Toggle a preset's active state. Inactive presets are hidden from shops. */
export async function setPresetActive(
  presetId: string,
  isActive: boolean,
  adminId: string,
): Promise<PresetMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_service_presets")
    .update({
      is_active: isActive,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presetId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบริการ preset นี้" };
  return { ok: true, id: data.id as string };
}

/**
 * Delete a preset. Shops that already imported it keep their `shop_services`
 * copy untouched — the copy carries no FK back to the preset.
 */
export async function deletePreset(
  presetId: string,
): Promise<PresetMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("category_service_presets")
    .delete()
    .eq("id", presetId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบริการ preset นี้" };
  return { ok: true, id: data.id as string };
}
