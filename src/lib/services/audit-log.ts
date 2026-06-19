import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Admin audit log. SRP: own writes into + reads from `admin_audit_logs` —
 * nothing else. This is an observability record of admin moderation actions,
 * NOT an authorization mechanism.
 *
 * Two hard rules:
 *  1. Writes are FAIL-SILENT. A logging failure must never break the
 *     moderation action it accompanies — `writeAuditLog` only ever resolves,
 *     never rejects, and swallows DB errors with a console.error. Callers log
 *     SUCCESS only (after the underlying service returned ok:true) and pass
 *     `adminId` from the VERIFIED session, never from request/form input.
 *  2. Reads degrade to `[]` on any infra error rather than throwing — a broken
 *     audit page must not take down the admin shell.
 *
 * RLS is deny-all on `admin_audit_logs`; all access is via the service-role
 * client, so there is no row-level authz here — the page itself is gated to
 * admins by the `(authed)` layout + proxy.
 */

// ----- Types --------------------------------------------------------------

/** Every auditable admin action, namespaced by entity. */
export type AuditAction =
  | "shop.update"
  | "shop.impersonate"
  | "category.create"
  | "category.update"
  | "category.toggle_active"
  | "category.delete"
  | "preset.create"
  | "preset.update"
  | "preset.toggle_active"
  | "preset.delete";

/** The kind of entity an action targets — drives the "ประเภท" column. */
export type AuditEntityType = "shop" | "category" | "preset";

export type WriteAuditLogInput = {
  /** Acting admin's id — MUST come from the verified session. */
  adminId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  /** The affected row's id when there is one (null for bulk/none). */
  entityId?: string | null;
  /** Short human label, e.g. the shop/category name at the time of action. */
  summary?: string | null;
  /** Structured extras (reason, shopName, …) — kept compact for display. */
  meta?: Record<string, unknown> | null;
};

/** One audit row joined to the acting admin, for the audit-log page. */
export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string; // ISO timestamp (created_at)
  adminName: string | null;
  adminPhone: string | null;
};

/** Optional read filter — all fields AND-combined, all optional. */
export type AuditLogFilter = {
  action?: AuditAction;
  entityType?: AuditEntityType;
  adminId?: string;
};

// ----- Internal row shapes ------------------------------------------------

/**
 * The selected row with the admins join. Supabase returns the joined relation
 * as a nested object (or array, depending on the relationship); we read the
 * single related admin defensively.
 */
type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  admins: { name: string | null; phone: string | null } | null;
};

const READ_LIMIT = 200;

// ----- Write: fail-silent insert ------------------------------------------

/**
 * Record a successful admin action. Best-effort: any failure is logged
 * server-side and swallowed so the caller's moderation flow is unaffected.
 * Never throws, never rejects.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("admin_audit_logs").insert({
      admin_id: input.adminId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      summary: input.summary ?? null,
      meta: input.meta ?? null,
    });
    if (error) {
      console.error("writeAuditLog insert error:", error);
    }
  } catch (err) {
    console.error("writeAuditLog unexpected error:", err);
  }
}

// ----- Read: audit-log page -----------------------------------------------

/**
 * List the most recent audit entries (newest first, capped at 200), optionally
 * filtered by action / entity type / acting admin. Joined to `admins` for the
 * actor's name + phone. Degrades to `[]` on any infra error.
 */
export async function listAuditLogs(
  filter: AuditLogFilter = {},
): Promise<AuditLogEntry[]> {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("admin_audit_logs")
      .select(
        "id, action, entity_type, entity_id, summary, meta, created_at, admins(name, phone)",
      )
      .order("created_at", { ascending: false })
      .limit(READ_LIMIT);

    if (filter.action) query = query.eq("action", filter.action);
    if (filter.entityType) query = query.eq("entity_type", filter.entityType);
    if (filter.adminId) query = query.eq("admin_id", filter.adminId);

    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("listAuditLogs error:", error);
      return [];
    }

    return (data as unknown as AuditLogRow[]).map((row) => {
      const admin = Array.isArray(row.admins) ? row.admins[0] : row.admins;
      return {
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        summary: row.summary,
        meta: row.meta,
        createdAt: row.created_at,
        adminName: admin?.name ?? null,
        adminPhone: admin?.phone ?? null,
      };
    });
  } catch (err) {
    console.error("listAuditLogs unexpected error:", err);
    return [];
  }
}
