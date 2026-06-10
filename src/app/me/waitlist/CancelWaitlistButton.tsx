"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cancelMyWaitlistEntry } from "@/app/me/actions";

/**
 * Leave the waitlist for one entry. Mirrors CancelBookingButton: a confirm
 * dialog over the `cancelMyWaitlistEntry` server action (keyed to the session
 * phone in the action, so a customer can only retract their own entry).
 */
export function CancelWaitlistButton({ entryId }: { entryId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="border-2 border-outline-variant rounded-full px-4 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md font-semibold flex items-center justify-center gap-2"
        >
          <Icon name="notifications_off" size={18} />
          ออกจากรายการรอ
        </button>
      }
      title="ออกจากรายการรอหรือไม่?"
      description="เราจะหยุดแจ้งเตือนเมื่อมีคิวว่างสำหรับรายการนี้"
      confirmLabel="ออกจากรายการรอ"
      cancelLabel="ไม่"
      destructive
      onConfirm={() => cancelMyWaitlistEntry(entryId)}
    />
  );
}
