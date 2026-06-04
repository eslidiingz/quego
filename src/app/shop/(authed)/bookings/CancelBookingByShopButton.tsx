"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
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
          className="flex-1 sm:flex-none whitespace-nowrap border-2 border-outline-variant rounded-full px-4 py-2 text-on-surface-variant hover:bg-error/5 hover:border-error/40 hover:text-error transition-colors text-label-md font-semibold flex items-center justify-center gap-2"
        >
          <Icon name="cancel" size={18} />
          ยกเลิก
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
