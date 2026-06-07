"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatBaht } from "@/lib/baht";
import type { ShopCardService } from "./PublicShopCard";

const MAX_VISIBLE_SERVICES = 3;

/**
 * The service-chips row on a discovery card. The first few services render as
 * plain chips; the "+N" overflow becomes a button that opens a modal listing
 * EVERY service (name + price) for that shop.
 *
 * The whole card is a `<Link>`, so the "+N" button calls
 * `preventDefault`/`stopPropagation` to open the modal instead of navigating
 * to the shop detail page. Plain chips keep bubbling to the Link (navigate).
 *
 * SRP: render the chips + own the "show all services" modal state. Pricing is
 * formatted via the shared `formatBaht` so it matches the card's "เริ่มต้น".
 */
export function ShopServiceChips({
  services,
  shopName,
}: {
  services: ShopCardService[];
  shopName: string;
}) {
  const [open, setOpen] = useState(false);

  const visible = services.slice(0, MAX_VISIBLE_SERVICES);
  const extra = services.length - visible.length;

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {visible.map((s, i) => (
          <span
            key={`${s.name}-${i}`}
            className="max-w-[8rem] truncate rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
          >
            {s.name}
          </span>
        ))}
        {extra > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              // Inside the card's <Link>: don't navigate, open the modal.
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
            aria-label={`ดูบริการทั้งหมด ${services.length} รายการ`}
            className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-primary-container/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            +{extra}
          </button>
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`บริการของ ${shopName}`}
        size="sm"
      >
        <ul className="divide-y divide-outline-variant/40">
          {services.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-body-md text-on-surface">{s.name}</span>
              {s.price != null ? (
                <span className="shrink-0 text-body-md font-semibold text-primary">
                  {formatBaht(s.price)}
                </span>
              ) : (
                <span className="shrink-0 text-label-sm text-on-surface-variant">
                  สอบถามราคา
                </span>
              )}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
