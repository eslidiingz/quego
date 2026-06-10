/**
 * PURE presentation helpers for the admin audit log. No `server-only`, no DB —
 * just label mapping + meta shaping so the table component (and any future
 * consumer) renders consistent Thai copy. Co-located with the service for
 * discoverability, but deliberately framework- and IO-free so it's unit-tested
 * in isolation.
 *
 * SRP: turn machine-readable audit codes/meta into human Thai strings. The set
 * of action/entity codes is owned by audit-log.ts; this module only knows how
 * to *display* them.
 */

import type { AuditAction, AuditEntityType } from "./audit-log";

/**
 * Thai label for each audit action. Keep in sync with the `AuditAction` union
 * in audit-log.ts — TypeScript enforces exhaustiveness via the typed key, and
 * the fallback below keeps an unknown/legacy code from rendering as blank.
 */
const ACTION_LABELS: Record<AuditAction, string> = {
  "shop.approve": "อนุมัติร้าน",
  "shop.reject": "ปฏิเสธร้าน",
  "shop.update": "แก้ไขข้อมูลร้าน",
  "shop.impersonate": "เข้าสู่ระบบแทนร้าน",
  "category.create": "เพิ่มหมวดหมู่",
  "category.update": "แก้ไขหมวดหมู่",
  "category.delete": "ลบหมวดหมู่",
  "preset.create": "เพิ่มบริการ preset",
  "preset.update": "แก้ไขบริการ preset",
  "preset.toggle_active": "เปิด/ปิดบริการ preset",
  "preset.delete": "ลบบริการ preset",
};

/** Thai label for each entity type, for the table's "ประเภท" column. */
const ENTITY_LABELS: Record<AuditEntityType, string> = {
  shop: "ร้าน",
  category: "หมวดหมู่",
  preset: "บริการ preset",
};

const UNKNOWN_ACTION_LABEL = "การกระทำอื่น";
const UNKNOWN_ENTITY_LABEL = "อื่น ๆ";

/**
 * Map an audit action to its Thai label. Accepts a plain string (the DB column
 * is `text`, so a row written by an older deploy could carry an action this
 * build doesn't know) and falls back to a generic label rather than rendering
 * empty.
 */
export function thaiActionLabel(action: string): string {
  return ACTION_LABELS[action as AuditAction] ?? UNKNOWN_ACTION_LABEL;
}

/** Map an entity type to its Thai label, with a generic fallback. */
export function thaiEntityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType as AuditEntityType] ?? UNKNOWN_ENTITY_LABEL;
}

/**
 * Compact one-line rendering of a meta object for the table. Returns null when
 * there's nothing meaningful to show, so callers can skip the cell entirely.
 * Values are coerced to short strings; nested objects/arrays are JSON-encoded
 * so the row never throws on an unexpected shape.
 */
export function formatMetaSummary(
  meta: Record<string, unknown> | null | undefined,
): string | null {
  if (!meta) return null;
  const entries = Object.entries(meta).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (entries.length === 0) return null;
  return entries
    .map(([key, value]) => `${key}: ${stringifyMetaValue(value)}`)
    .join(" · ");
}

function stringifyMetaValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
