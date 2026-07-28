"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";
import { useTour } from "@/components/tour/TourProvider";
import type { ShopSetupStep } from "@/lib/services/shop-setup";

// Where each step is completed — the modal stays out of the way while the owner
// is actually on that page fixing it.
const STEP_DESTINATION: Record<ShopSetupStep["key"], string> = {
  services: "/shop/services",
  hours: "/shop/profile",
};

/**
 * First-run setup modal, rendered once by the shop `(authed)` layout so it
 * follows the owner across every management page until setup is complete. It
 * pulls focus to the one step still blocking bookings (services first, then
 * business hours) and is dismissable ("ไว้ทีหลัง" / Esc / backdrop) so the owner
 * is never trapped — but it re-asserts itself on the next page.
 *
 * SRP / DIP: presentation + open-state only. The route layer resolves *which*
 * step (via `getShopSetupStep`) and passes the descriptor; this component owns
 * no data access.
 */
export function ShopSetupModal({ step }: { step: ShopSetupStep }) {
  const pathname = usePathname();
  const { isActive } = useTour();

  // Stay out of the way while a guided tour is running — the tour overlay sits
  // above this (z-70 vs z-50), so stacking both would bury the modal behind the
  // scrim with no way to reach it. The layout already withholds this modal
  // during the *first-run* tour; this covers replays from the ? button.
  if (isActive) return null;

  // Don't block the very page where the owner completes this step.
  if (pathname.startsWith(STEP_DESTINATION[step.key])) return null;

  // Keyed by pathname so the dialog re-mounts on every navigation: "ไว้ทีหลัง"
  // only dismisses for the current page, and the reminder pops again when the
  // owner moves elsewhere (the layout itself never re-mounts across soft navs).
  return <SetupDialog key={pathname} step={step} />;
}

function SetupDialog({ step }: { step: ShopSetupStep }) {
  const [open, setOpen] = useState(true);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="ตั้งค่าร้านให้พร้อมรับจอง"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={buttonClassName({ variant: "outline", size: "md" })}
          >
            ไว้ทีหลัง
          </button>
          <Link
            href={step.ctaHref}
            onClick={() => setOpen(false)}
            className={buttonClassName({ variant: "primary", size: "md" })}
          >
            {step.ctaLabel}
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <Icon name={step.icon} size={28} />
        </span>
        <p className="text-body-lg font-bold text-on-surface">{step.title}</p>
        <p className="text-body-md text-on-surface-variant">{step.description}</p>
      </div>
    </Modal>
  );
}
