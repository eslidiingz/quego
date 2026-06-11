"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { cancelBookingByLinkAction } from "./actions";

/**
 * OPP-04 — customer self-service actions on the UUID-gated booking page.
 * "เลื่อนเวลา" links to the reschedule picker; "ยกเลิกคิว" opens an in-app modal
 * (never a native dialog) that requires the booking's phone to confirm — the
 * phone is masked on this shareable page, so a shared link alone can't cancel
 * someone else's queue. The action's thrown message is shown inline in the modal.
 *
 * The two top-level controls are the SAME height (h-12), each `w-full` within
 * their grid cell, single-line, and icon-led, so the pair stays visually
 * balanced on mobile (375px, stacked) and sm+ (side-by-side, equal width).
 */
export function ManageBookingActions({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = /^[0-9]{9,10}$/u.test(phone);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setPhone("");
    setError(null);
  };

  const handleConfirm = async () => {
    if (!phoneValid || pending) return;
    setPending(true);
    setError(null);
    try {
      await cancelBookingByLinkAction(bookingId, phone);
      // Success revalidates the page (status leaves "confirmed"), which unmounts
      // this whole block — but close the modal first for a clean transition.
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setPending(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/bookings/${bookingId}/reschedule`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors text-label-md font-semibold"
        >
          <Icon name="edit_calendar" size={18} />
          เลื่อนเวลา
        </Link>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-outline-variant text-on-surface-variant hover:border-error hover:bg-error/5 hover:text-error transition-colors text-label-md font-semibold"
        >
          <Icon name="cancel" size={18} />
          ยกเลิกคิว
        </button>
      </div>

      <Modal
        open={open}
        onClose={close}
        title="ยกเลิกการจอง"
        footer={
          <>
            <Button
              variant="outline"
              onClick={close}
              disabled={pending}
            >
              ไม่ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!phoneValid || pending}
              iconLeft={
                pending ? (
                  <Icon name="progress_activity" className="animate-spin" />
                ) : undefined
              }
            >
              {pending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            ยืนยันเบอร์โทรที่ใช้จองเพื่อยกเลิกคิวนี้ — การยกเลิกไม่สามารถกู้คืนได้
            และคิวนี้จะถูกปลดออกให้ลูกค้าท่านอื่นจองแทน
          </p>
          <PhoneInput
            name="phone"
            label="เบอร์โทรที่ใช้จอง"
            required
            placeholder="กรอกเบอร์โทรที่ใช้จองคิวนี้"
            value={phone}
            onChange={setPhone}
            errorText={error ?? undefined}
            disabled={pending}
          />
        </div>
      </Modal>
    </>
  );
}
