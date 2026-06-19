import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import type {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
} from "@/lib/services/audit-log";
import {
  thaiActionLabel,
  thaiEntityLabel,
  formatMetaSummary,
} from "@/lib/services/audit-format";

/**
 * Pure presentation for the admin audit log: a filter bar (link-based, mirrors
 * StatusTabs so the page re-reads the URL) plus a read-only table. No fetching,
 * no client state — every value is injected, so this stays a server component.
 */

const ACTION_FILTERS: { value: AuditAction; label: string }[] = [
  { value: "shop.update", label: "แก้ไขร้าน" },
  { value: "shop.impersonate", label: "เข้าระบบแทนร้าน" },
  { value: "category.create", label: "เพิ่มหมวดหมู่" },
  { value: "category.update", label: "แก้ไขหมวดหมู่" },
  { value: "category.delete", label: "ลบหมวดหมู่" },
  { value: "preset.create", label: "เพิ่ม preset" },
  { value: "preset.update", label: "แก้ไข preset" },
  { value: "preset.toggle_active", label: "เปิด/ปิด preset" },
  { value: "preset.delete", label: "ลบ preset" },
];

const ENTITY_FILTERS: { value: AuditEntityType; label: string }[] = [
  { value: "shop", label: "ร้าน" },
  { value: "category", label: "หมวดหมู่" },
  { value: "preset", label: "บริการ preset" },
];

/** Format an ISO timestamp as a Bangkok-local "DD/MM/YYYY HH:MM" string. */
function formatBangkokTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

/** Build an /admin/audit URL carrying only the non-empty filter params. */
function auditHref(params: {
  action?: AuditAction | null;
  entityType?: AuditEntityType | null;
}): string {
  const search = new URLSearchParams();
  if (params.action) search.set("action", params.action);
  if (params.entityType) search.set("entityType", params.entityType);
  const qs = search.toString();
  return qs ? `/admin/audit?${qs}` : "/admin/audit";
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "px-3 py-1.5 rounded-full text-label-md whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-on-primary font-bold shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      {label}
    </Link>
  );
}

export function AuditLogTable({
  entries,
  activeAction,
  activeEntityType,
}: {
  entries: AuditLogEntry[];
  activeAction: AuditAction | null;
  activeEntityType: AuditEntityType | null;
}) {
  const hasActiveFilters = activeAction !== null || activeEntityType !== null;

  return (
    <div className="space-y-6">
      {/* Entity-type filter row — scrolls horizontally on phones, wraps on sm+ */}
      <nav
        className="flex flex-nowrap sm:flex-wrap gap-1 p-1 bg-surface-container-low rounded-2xl border border-outline-variant overflow-x-auto no-scrollbar"
        aria-label="กรองตามประเภท"
      >
        <FilterPill
          href={auditHref({ action: activeAction, entityType: null })}
          label="ทุกประเภท"
          active={activeEntityType === null}
        />
        {ENTITY_FILTERS.map((f) => (
          <FilterPill
            key={f.value}
            href={auditHref({ action: activeAction, entityType: f.value })}
            label={f.label}
            active={activeEntityType === f.value}
          />
        ))}
      </nav>

      {/* Action filter row — scrolls horizontally on phones, wraps on sm+ */}
      <nav
        className="flex flex-nowrap sm:flex-wrap gap-1 p-1 bg-surface-container-low rounded-2xl border border-outline-variant overflow-x-auto no-scrollbar"
        aria-label="กรองตามการกระทำ"
      >
        <FilterPill
          href={auditHref({ action: null, entityType: activeEntityType })}
          label="ทุกการกระทำ"
          active={activeAction === null}
        />
        {ACTION_FILTERS.map((f) => (
          <FilterPill
            key={f.value}
            href={auditHref({ action: f.value, entityType: activeEntityType })}
            label={f.label}
            active={activeAction === f.value}
          />
        ))}
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-on-surface-variant text-body-md">
          {entries.length === 0
            ? "ไม่พบรายการตามเงื่อนไขนี้"
            : `แสดง ${entries.length} รายการล่าสุด`}
        </p>
        {hasActiveFilters ? (
          <Link
            href="/admin/audit"
            scroll={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="filter_alt_off" size={18} />
            ล้างตัวกรอง
          </Link>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
            <Icon name="history" size={32} />
          </div>
          <p className="text-body-md text-on-surface">ยังไม่มีบันทึกการกระทำ</p>
          <p className="text-label-md text-on-surface-variant mt-1">
            การกระทำของผู้ดูแลจะถูกบันทึกที่นี่โดยอัตโนมัติ
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: card list (the table's columns don't fit a phone width) */}
          <ul className="space-y-3 md:hidden">
            {entries.map((entry) => (
              <AuditLogCard key={entry.id} entry={entry} />
            ))}
          </ul>

          {/* Desktop / tablet: full table */}
          <div className="hidden md:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="px-6 py-3">เวลา</th>
                  <th className="px-6 py-3">ผู้ดูแล</th>
                  <th className="px-6 py-3">การกระทำ</th>
                  <th className="px-6 py-3 hidden md:table-cell">ประเภท</th>
                  <th className="px-6 py-3 hidden lg:table-cell">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const meta = formatMetaSummary(entry.meta);
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low/50 transition-colors align-top"
                    >
                      <td className="px-6 py-4 text-label-md text-on-surface-variant whitespace-nowrap tabular-nums">
                        {formatBangkokTimestamp(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-on-surface">
                          {entry.adminName ?? "ผู้ดูแลระบบ"}
                        </span>
                        {entry.adminPhone ? (
                          <span className="block text-label-sm text-on-surface-variant tabular-nums">
                            {entry.adminPhone}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body-md text-on-surface">
                          {thaiActionLabel(entry.action)}
                        </span>
                        {entry.summary ? (
                          <span className="block text-label-sm text-on-surface-variant">
                            {entry.summary}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-label-md text-on-surface-variant">
                        {thaiEntityLabel(entry.entityType)}
                        {entry.entityId ? (
                          <span className="block text-label-sm text-on-surface-variant/70 font-mono">
                            {entry.entityId.slice(0, 8)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-label-md text-on-surface-variant max-w-xs break-words">
                        {meta ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mobile rendering of one audit entry. The desktop table hides the
 * type/detail columns on narrow screens, so the card surfaces every field in a
 * stacked layout that reads comfortably at a phone width.
 */
function AuditLogCard({ entry }: { entry: AuditLogEntry }) {
  const meta = formatMetaSummary(entry.meta);
  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-md font-medium text-on-surface">
            {thaiActionLabel(entry.action)}
          </p>
          {entry.summary ? (
            <p className="text-label-sm text-on-surface-variant mt-0.5 break-words">
              {entry.summary}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-label-sm text-on-surface-variant whitespace-nowrap tabular-nums">
          {formatBangkokTimestamp(entry.createdAt)}
        </span>
      </div>

      <dl className="space-y-1.5 border-t border-outline-variant/40 pt-3 text-label-md">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="person" size={16} className="shrink-0" />
          <span className="text-on-surface">
            {entry.adminName ?? "ผู้ดูแลระบบ"}
          </span>
          {entry.adminPhone ? (
            <span className="tabular-nums">· {entry.adminPhone}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="sell" size={16} className="shrink-0" />
          <span>{thaiEntityLabel(entry.entityType)}</span>
          {entry.entityId ? (
            <span className="font-mono text-on-surface-variant/70">
              {entry.entityId.slice(0, 8)}
            </span>
          ) : null}
        </div>
        {meta ? (
          <div className="flex items-start gap-2 text-on-surface-variant">
            <Icon name="info" size={16} className="shrink-0 mt-0.5" />
            <span className="break-words">{meta}</span>
          </div>
        ) : null}
      </dl>
    </li>
  );
}
