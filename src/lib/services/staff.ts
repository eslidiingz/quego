import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Shop-staff (พนักงาน) service. One shop has many staff, each acting as a
 * parallel service line: the count of *active* staff is the per-slot booking
 * capacity (see `bookings.ts`).
 *
 * SRP: CRUD + the active-count read used by the booking layer. All access goes
 * through the service-role client (RLS deny-all on `shop_staff`), so every
 * authorization decision is made here. Ownership is enforced with a compound
 * `.eq("shop_id", shopId)` filter on every mutation — `shopId` MUST come from
 * the caller's verified session, never from request input, so a shop can only
 * touch its own staff even by guessing a staff UUID.
 */

// ----- Types --------------------------------------------------------------

export type StaffListItem = {
  id: string;
  name: string;
  nickname: string | null;
  role: string | null;
  phone: string | null;
  isActive: boolean;
  sortOrder: number;
  /**
   * Whether this staff member serves customers. false = back-of-house
   * (manager, housekeeper): not a booking line, hidden from the customer
   * staff-picker. When false, `serviceIds` is always empty.
   */
  providesService: boolean;
  /** IDs of services this staff member is assigned to. Empty = all services. */
  serviceIds: string[];
};

export type StaffInput = {
  name: string;
  nickname?: string | null;
  role?: string | null;
  phone?: string | null;
  isActive?: boolean;
  /** Defaults to true (serves customers). false for back-of-house staff. */
  providesService?: boolean;
};

export type StaffMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "invalid" | "not_found" | "unknown";
      message: string;
    };

type StaffRow = {
  id: string;
  name: string;
  nickname: string | null;
  role: string | null;
  phone: string | null;
  is_active: boolean;
  sort_order: number;
  provides_service: boolean;
};

function mapRow(r: StaffRow, serviceIds: string[] = []): StaffListItem {
  return {
    id: r.id,
    name: r.name,
    nickname: r.nickname,
    role: r.role,
    phone: r.phone,
    isActive: r.is_active,
    sortOrder: r.sort_order,
    providesService: r.provides_service,
    serviceIds,
  };
}

// ----- Read ---------------------------------------------------------------

/**
 * All staff for one shop (active and inactive), ordered for the management
 * list. Inactive staff are kept so the owner can re-enable them.
 */
export async function listStaffByShop(
  shopId: string,
): Promise<StaffListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_staff")
    .select("id, name, nickname, role, phone, is_active, sort_order, provides_service")
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  const rows = data as StaffRow[];

  // Fetch service assignments for all staff in one query.
  const staffIds = rows.map((r) => r.id);
  const { data: assignments } = staffIds.length
    ? await supabase
        .from("shop_staff_services")
        .select("staff_id, service_id")
        .in("staff_id", staffIds)
    : { data: [] };

  const serviceMap = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    const list = serviceMap.get(a.staff_id as string) ?? [];
    list.push(a.service_id as string);
    serviceMap.set(a.staff_id as string, list);
  }

  return rows.map((r) => mapRow(r, serviceMap.get(r.id) ?? []));
}

/**
 * Number of *active, service-providing* staff for a shop — the per-slot booking
 * capacity. Back-of-house staff (`provides_service = false`, e.g. manager,
 * housekeeper) are excluded: they don't add a booking line. Returns 0 for shops
 * with no service staff (the booking layer treats 0 as the legacy single-queue
 * capacity of 1).
 */
export async function countActiveStaff(shopId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("shop_staff")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .eq("provides_service", true);

  if (error || count == null) return 0;
  return count;
}

// ----- Write --------------------------------------------------------------

function normalize(input: StaffInput): {
  name: string;
  nickname: string | null;
  role: string | null;
  phone: string | null;
} | null {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 120) return null;
  return {
    name,
    nickname: input.nickname?.trim() || null,
    role: input.role?.trim() || null,
    phone: input.phone?.trim() || null,
  };
}

/**
 * Add a staff member. New rows append to the end of the list (sort_order =
 * current staff count). Format validation also runs in the action layer; the
 * guard here is the server-side backstop.
 */
export async function createStaff(
  shopId: string,
  input: StaffInput,
): Promise<StaffMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลพนักงานไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from("shop_staff")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  const { data, error } = await supabase
    .from("shop_staff")
    .insert({
      shop_id: shopId,
      name: fields.name,
      nickname: fields.nickname,
      role: fields.role,
      phone: fields.phone,
      is_active: input.isActive ?? true,
      provides_service: input.providesService ?? true,
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
 * Update a staff member's profile fields. Ownership enforced by the compound
 * `id + shop_id` filter — a mismatch returns zero rows → `not_found`.
 */
export async function updateStaff(
  shopId: string,
  staffId: string,
  input: StaffInput,
): Promise<StaffMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลพนักงานไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    name: fields.name,
    nickname: fields.nickname,
    role: fields.role,
    phone: fields.phone,
    updated_at: new Date().toISOString(),
  };
  if (input.providesService !== undefined) {
    update.provides_service = input.providesService;
  }
  if (input.isActive !== undefined) update.is_active = input.isActive;

  const { data, error } = await supabase
    .from("shop_staff")
    .update(update)
    .eq("id", staffId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบพนักงานนี้" };
  return { ok: true, id: data.id as string };
}

/**
 * Toggle a staff member's active state. Deactivating immediately removes them
 * as a service line (slot capacity drops), but keeps their bookings intact.
 */
export async function setStaffActive(
  shopId: string,
  staffId: string,
  isActive: boolean,
): Promise<StaffMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_staff")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", staffId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบพนักงานนี้" };
  return { ok: true, id: data.id as string };
}

/**
 * Replace all service assignments for a staff member. Pass an empty array to
 * clear assignments (meaning the staff member can perform all services).
 * Uses a delete-then-insert pattern inside two sequential statements — not
 * wrapped in a transaction because the service-role client doesn't expose one,
 * but partial failure (delete ok / insert error) is surfaced as a result.
 */
export async function setStaffServices(
  shopId: string,
  staffId: string,
  serviceIds: string[],
): Promise<StaffMutationResult> {
  const supabase = getSupabaseAdmin();

  // Verify ownership — the staff row must belong to this shop.
  const { data: staffRow } = await supabase
    .from("shop_staff")
    .select("id")
    .eq("id", staffId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!staffRow) return { ok: false, code: "not_found", message: "ไม่พบพนักงานนี้" };

  const { error: delError } = await supabase
    .from("shop_staff_services")
    .delete()
    .eq("staff_id", staffId);
  if (delError) return { ok: false, code: "unknown", message: delError.message };

  if (serviceIds.length > 0) {
    const rows = serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid }));
    const { error: insError } = await supabase
      .from("shop_staff_services")
      .insert(rows);
    if (insError) return { ok: false, code: "unknown", message: insError.message };
  }

  return { ok: true, id: staffId };
}

/**
 * Delete a staff member. Bookings referencing them keep existing — the FK is
 * `on delete set null`, so historical bookings simply lose the assignment.
 */
export async function deleteStaff(
  shopId: string,
  staffId: string,
): Promise<StaffMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_staff")
    .delete()
    .eq("id", staffId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบพนักงานนี้" };
  return { ok: true, id: data.id as string };
}
