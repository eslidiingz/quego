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
          className="border-2 border-outline-variant rounded-full px-4 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md font-semibold flex items-center justify-center gap-2"
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
