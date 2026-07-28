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
          className="w-full h-11 border-2 border-outline-variant rounded-full px-4 whitespace-nowrap text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md font-semibold flex items-center justify-center gap-2"
        >
          <Icon name="notifications_off" size={18} />
          ออกจากรายการรอ
        </button>
      }
      title="ออกจากรายการรอหรือไม่?"
      description="รายการนี้จะถูกนำออก และจะไม่ได้รับการเสนอคิวเมื่อมีที่ว่าง"
      confirmLabel="ออกจากรายการรอ"
      cancelLabel="ไม่"
      destructive
      onConfirm={() => cancelMyWaitlistEntry(entryId)}
    />
  );
}
