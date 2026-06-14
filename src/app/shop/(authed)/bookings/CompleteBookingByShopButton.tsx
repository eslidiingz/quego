"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { ACTION_BASE, COMPLETE_STYLE } from "./bookingPresentation";
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
          aria-label={`ทำเครื่องหมายว่าเสร็จสิ้น ${customerName}`}
          className={cn(ACTION_BASE, COMPLETE_STYLE)}
        >
          <Icon name="check" size={18} />
          <span>เสร็จสิ้น</span>
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
