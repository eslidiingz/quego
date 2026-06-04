"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { markBookingCompleted } from "./actions";

/**
 * Shop-side "mark this booking completed" trigger. Thin client island so the
 * server-rendered BookingRow can stay a server component — only this confirm
 * affordance needs interactivity.
 *
 * SRP: renders the trigger + confirm copy; the ownership check and the
 * status transition live in `markBookingCompleted` / the service layer.
 */
export function CompleteBookingByShopButton({
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
          className="flex-1 sm:flex-none whitespace-nowrap rounded-full border-2 border-transparent bg-success text-on-success px-4 py-2 text-label-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Icon name="check" size={18} />
          เสร็จสิ้น
        </button>
      }
      title="ยืนยันเสร็จสิ้น?"
      description={
        <div className="space-y-1">
          <p>
            ลูกค้า{" "}
            <span className="font-bold text-on-surface">{customerName}</span>{" "}
            เวลา{" "}
            <span className="font-bold text-on-surface">{slotTime} น.</span>
          </p>
          <p>
            เมื่อยืนยันแล้ว สถานะของรายการนี้จะเปลี่ยนเป็น
            &ldquo;เสร็จสิ้น&rdquo;
          </p>
        </div>
      }
      confirmLabel="เสร็จสิ้น"
      cancelLabel="ปิด"
      onConfirm={() => markBookingCompleted(bookingId)}
    />
  );
}
