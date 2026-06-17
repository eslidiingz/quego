import { PageHeader } from "@/components/layout/PageHeader";
import {
  listAuditLogs,
  type AuditAction,
  type AuditEntityType,
  type AuditLogFilter,
} from "@/lib/services/audit-log";
import { AuditLogTable } from "./AuditLogTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "บันทึกการกระทำ · Quego Admin",
};

/** Action codes the filter UI may select — validated against the page input. */
const KNOWN_ACTIONS: readonly AuditAction[] = [
  "shop.update",
  "shop.impersonate",
  "category.create",
  "category.update",
  "category.delete",
  "preset.create",
  "preset.update",
  "preset.toggle_active",
  "preset.delete",
];

const KNOWN_ENTITY_TYPES: readonly AuditEntityType[] = [
  "shop",
  "category",
  "preset",
];

function asAction(value: string | undefined): AuditAction | undefined {
  return value && (KNOWN_ACTIONS as readonly string[]).includes(value)
    ? (value as AuditAction)
    : undefined;
}

function asEntityType(value: string | undefined): AuditEntityType | undefined {
  return value && (KNOWN_ENTITY_TYPES as readonly string[]).includes(value)
    ? (value as AuditEntityType)
    : undefined;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>;
}) {
  const params = await searchParams;
  const action = asAction(params.action);
  const entityType = asEntityType(params.entityType);

  const filter: AuditLogFilter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const entries = await listAuditLogs(filter);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="การตรวจสอบ"
        title="บันทึกการกระทำ"
        description="ประวัติการแก้ไขและจัดการของผู้ดูแลระบบ แสดงล่าสุด 200 รายการ"
      />
      <AuditLogTable
        entries={entries}
        activeAction={action ?? null}
        activeEntityType={entityType ?? null}
      />
    </div>
  );
}
