"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { markBookingNoShowAction } from "./actions";

/**
 * Shop-side "mark this booking as a no-show" trigger. Thin client island so
 * the server-rendered BookingRow can stay a server component — only this
 * confirm affordance needs interactivity.
 *
 * SRP: renders the trigger + confirm copy; the ownership check and the
 * status transition live in `markBookingNoShowAction` / the service layer.
 *
 * Tertiary (gold) accent reads as a distinct "caution" tone, separating it
 * from the success-green "เสร็จสิ้น" and the error-red "ยกเลิก" (there is no
 * dedicated `warning` token in the design system).
 */
export function NoShowBookingByShopButton({
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
          className="w-full sm:w-auto whitespace-nowrap border-2 border-outline-variant rounded-full px-3 sm:px-4 py-2 text-on-surface-variant hover:bg-tertiary/5 hover:border-tertiary/40 hover:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 transition-colors text-label-sm sm:text-label-md font-semibold flex items-center justify-center gap-1.5"
        >
          <Icon name="event_busy" size={18} />
          ไม่มาตามนัด
        </button>
      }
      title="ทำเครื่องหมายว่าไม่มาตามนัด?"
      description={
        <div className="space-y-1">
          <p>
            ลูกค้า{" "}
            <span className="font-bold text-on-surface">{customerName}</span>{" "}
            เวลา{" "}
            <span className="font-bold text-on-surface">{slotTime} น.</span>
          </p>
          <p>
            เมื่อยืนยันแล้ว คิวนี้จะถูกบันทึกว่าลูกค้าไม่มาตามนัด
            และนับรวมในประวัติการไม่มาของลูกค้ารายนี้ที่ร้านของคุณ
          </p>
        </div>
      }
      confirmLabel="ไม่มาตามนัด"
      cancelLabel="ปิด"
      onConfirm={() => markBookingNoShowAction(bookingId)}
    />
  );
}
