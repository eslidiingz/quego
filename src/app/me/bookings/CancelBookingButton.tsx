"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cancelMyBooking } from "@/app/me/actions";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-label-md font-semibold text-on-surface-variant hover:bg-error-container/40 hover:text-on-error-container transition-colors"
        >
          <Icon name="cancel" size={18} />
          ยกเลิกการจอง
        </button>
      }
      title="ยกเลิกการจองหรือไม่?"
      description="การยกเลิกไม่สามารถกู้คืนได้ และคิวนี้จะถูกปลดออกให้ลูกค้าท่านอื่นจองแทน"
      confirmLabel="ยกเลิกการจอง"
      cancelLabel="ไม่"
      destructive
      onConfirm={() => cancelMyBooking(bookingId)}
    />
  );
}
