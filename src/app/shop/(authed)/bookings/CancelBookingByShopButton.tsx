"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { ACTION_BASE, CANCEL_STYLE } from "./bookingPresentation";
import { cancelBookingByShopAction } from "./actions";

/**
 * Shop-side "cancel this booking" trigger. Thin client island so the
 * server-rendered BookingRow can stay a server component — only this confirm
 * affordance needs interactivity.
 *
 * SRP: renders the trigger + confirm copy; the ownership check and the
 * status transition live in `cancelBookingByShopAction` / the service layer.
 */
export function CancelBookingByShopButton({
  bookingId,
  customerName,
  slotTime,
}: {
  bookingId: string;
  customerName: string;
  slotTime: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          aria-label={`ยกเลิกการจองของ ${customerName}`}
          className={cn(ACTION_BASE, CANCEL_STYLE)}
        >
          <Icon name="cancel" size={18} />
          <span>ยกเลิก</span>
        </button>
      }
      title="ยกเลิกการจองหรือไม่?"
      description={
        <div className="space-y-1">
          <p>
            ลูกค้า{" "}
            <span className="font-bold text-on-surface">{customerName}</span>{" "}
            เวลา{" "}
            <span className="font-bold text-on-surface">{slotTime} น.</span>
          </p>
          <p>
            เมื่อยืนยันแล้ว คิวนี้จะถูกปลดออกและเปิดให้ลูกค้าท่านอื่นจองแทนได้
          </p>
        </div>
      }
      confirmLabel="ยกเลิกการจอง"
      cancelLabel="ไม่"
      destructive
      onConfirm={() => cancelBookingByShopAction(bookingId)}
    />
  );
}
