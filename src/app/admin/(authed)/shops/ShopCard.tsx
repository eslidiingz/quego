"use client";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { ShopListItem, ShopStatus } from "@/lib/services/shops";

// Registration is self-serve, so new shops are always `approved`. The only
// other value here is a legacy `rejected` tombstone from the old moderation
// era — rendered (read-only) so the admin can still recognise such rows.
const statusMap: Record<
  ShopStatus,
  { label: string; variant: "premium" | "danger" }
> = {
  approved: { label: "อนุมัติแล้ว", variant: "premium" },
  rejected: { label: "ปฏิเสธ (เลิกใช้แล้ว)", variant: "danger" },
};

/**
 * SRP: render one shop card and dispatch edit / impersonate callbacks. There is
 * no moderation — registration is self-serve — so the admin can only view,
 * edit, or impersonate. Knows nothing about Supabase or server actions; tests
 * can mount this with mock data only.
 */
export function ShopApplicationCard({
  shop,
  onEdit,
  onImpersonate,
  pending,
}: {
  shop: ShopListItem;
  onEdit: (shop: ShopListItem) => void;
  onImpersonate: (shop: ShopListItem) => void;
  pending: boolean;
}) {
  const status = statusMap[shop.status];
  const submitted = formatDate(shop.created_at);
  const reviewed = shop.reviewed_at ? formatDate(shop.reviewed_at) : null;
  // Only approved shops can be impersonated (matches the login guard).
  const canImpersonate = shop.status === "approved";

  return (
    <article
      id={`shop-${shop.id}`}
      // `#shop-<id>` anchor target: a deep link scrolls here (offset for the
      // sticky header) and briefly rings the card via the :target ring.
      className="scroll-mt-24 target:ring-2 target:ring-primary target:ring-offset-2 target:ring-offset-background bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-tinted transition-shadow space-y-4"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-headline-md text-on-surface">
              {shop.name}
            </h3>
            <Chip variant={status.variant} size="sm">
              {status.label}
            </Chip>
          </div>
          <p className="text-label-md text-on-surface-variant mt-1">
            {shop.category_name ?? "—"} · ส่งเมื่อ {submitted}
            {reviewed ? ` · ตรวจสอบเมื่อ ${reviewed}` : ""}
          </p>
        </div>
      </div>

      {shop.description ? (
        <p className="text-body-md text-on-surface-variant whitespace-pre-line">
          {shop.description}
        </p>
      ) : null}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-label-md">
        <DetailRow icon="person" label="เจ้าของ" value={shop.owner_name} />
        <DetailRow
          icon="phone"
          label="เบอร์โทร"
          value={formatPhone(shop.owner_phone)}
        />
        {shop.owner_email ? (
          <DetailRow icon="mail" label="อีเมล" value={shop.owner_email} />
        ) : null}
        {shop.contact_phone ? (
          <DetailRow
            icon="store"
            label="เบอร์ร้าน"
            value={formatPhone(shop.contact_phone)}
          />
        ) : null}
        {shop.address ? (
          <DetailRow icon="location_on" label="ที่อยู่" value={shop.address} />
        ) : null}
      </dl>

      <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-3 pt-2">
        {canImpersonate ? (
          <Button
            variant="outline"
            rounded="full"
            disabled={pending}
            onClick={() => onImpersonate(shop)}
            iconLeft={<Icon name="domino_mask" />}
          >
            เข้าใช้งานเป็นร้าน
          </Button>
        ) : null}
        <Button
          variant="outline"
          rounded="full"
          disabled={pending}
          onClick={() => onEdit(shop)}
          iconLeft={<Icon name="edit" />}
        >
          แก้ไขข้อมูล
        </Button>
      </div>
    </article>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-on-surface-variant">
      <Icon name={icon} size={18} className="text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-label-sm uppercase tracking-widest">{label}</dt>
        <dd className="text-body-md text-on-surface break-words">{value}</dd>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(raw: string): string {
  // 0812345678 → 081-234-5678
  if (raw.length === 10 && /^\d+$/.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
