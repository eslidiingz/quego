"use client";

import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type {
  BookingListItem,
  BookingStatus,
  CancelledBy,
} from "@/lib/services/bookings";
import {
  cancelBookingByShopAction,
  markBookingCompleted,
} from "./bookings/actions";

/**
 * Booking card used by the shop dashboard's "การจองวันนี้" list.
 *
 * Layout is a two-zone card so a narrow (375px) screen never crams the time,
 * customer details, and actions onto one line:
 *
 *   ┌ content ─────────────────────────┐ ┌ actions ┐
 *   │ [time]  name              status  │ │ เสร็จสิ้น │  ← stacks BELOW content on
 *   │         service · duration        │ │  ยกเลิก  │    mobile, sits to the RIGHT
 *   │         👤 staff                   │ └──────────┘    on sm+ (`sm:flex-row`).
 *   └───────────────────────────────────┘
 *
 * Confirmed bookings expose two labelled actions (complete / cancel); other
 * statuses render the content zone only, with a status chip.
 *
 * SRP: presentation + action plumbing only. Status transitions + ownership
 * checks live in the server actions / service layer.
 */
export function TodayBookingRow({ booking }: { booking: BookingListItem }) {
  const isConfirmed = booking.status === "confirmed";
  const chip = STATUS_CHIP[booking.status];
  // A cancelled booking surfaces WHO cancelled it (customer vs shop) so the
  // owner can read the dashboard at a glance; other statuses use the plain label.
  const chipLabel =
    booking.status === "cancelled"
      ? cancelChipLabel(booking.cancelledBy)
      : chip.label;

  // Reused in every confirm dialog body so the shop owner can double-check who
  // they're acting on before the status changes.
  const customer = (
    <p>
      ลูกค้า{" "}
      <span className="font-bold text-on-surface">{booking.customerName}</span>{" "}
      เวลา{" "}
      <span className="font-bold text-on-surface">{booking.slotTime} น.</span>
    </p>
  );

  return (
    <li
      className={cn(
        "rounded-2xl border p-3.5 sm:p-4 transition-colors",
        isConfirmed
          ? "border-outline-variant bg-surface-container-low/30"
          : "border-outline-variant/50",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* ── Content zone ─────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex shrink-0 min-w-[3.5rem] flex-col items-center justify-center rounded-xl bg-primary/10 px-2.5 py-2 leading-none">
            <span className="font-display text-headline-md font-bold text-primary">
              {booking.slotTime}
            </span>
            <span className="mt-1 text-label-sm text-primary/60">น.</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              {booking.customerPhone ? (
                <Link
                  href={`/shop/customers/${booking.customerPhone}`}
                  className="group inline-flex min-w-0 items-center gap-1 text-body-md font-bold text-on-surface hover:text-primary"
                >
                  <span className="truncate">{booking.customerName}</span>
                  <Icon
                    name="chevron_right"
                    size={16}
                    className="shrink-0 text-on-surface-variant group-hover:text-primary"
                  />
                </Link>
              ) : (
                <p className="truncate text-body-md font-bold text-on-surface">
                  {booking.customerName}
                </p>
              )}
              {!isConfirmed ? (
                <Chip variant={chip.variant} size="sm" className="shrink-0">
                  {chipLabel}
                </Chip>
              ) : null}
            </div>

            <p className="mt-1 truncate text-label-md text-on-surface-variant">
              {booking.serviceName ?? "บริการ"} · {booking.serviceDurationMinutes}{" "}
              นาที
            </p>

            {/* Staff chip (never overflows into the action zone). */}
            {booking.staffName ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-container/15 px-2 py-0.5 text-label-sm font-semibold text-primary">
                  <Icon name="person" size={13} className="shrink-0" />
                  <span className="truncate">{booking.staffName}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Action zone (confirmed only) ─────────────────────────── */}
        {isConfirmed ? (
          <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/60 pt-3 sm:flex sm:items-center sm:shrink-0 sm:border-t-0 sm:border-l sm:border-outline-variant/60 sm:pt-0 sm:pl-4">
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label={`ทำเครื่องหมายว่าเสร็จสิ้น ${booking.customerName}`}
                  className={cn(ACTION_BASE, COMPLETE_STYLE)}
                >
                  <Icon name="check" size={18} />
                  <span>เสร็จสิ้น</span>
                </button>
              }
              title="ทำเครื่องหมายว่าเสร็จสิ้น?"
              description={
                <div className="space-y-1">
                  {customer}
                  <p>
                    เมื่อยืนยันแล้ว สถานะของรายการนี้จะเปลี่ยนเป็น
                    &ldquo;เสร็จสิ้น&rdquo;
                  </p>
                </div>
              }
              confirmLabel="เสร็จสิ้น"
              cancelLabel="ปิด"
              onConfirm={() => markBookingCompleted(booking.id)}
            />

            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label={`ยกเลิกการจองของ ${booking.customerName}`}
                  className={cn(ACTION_BASE, CANCEL_STYLE)}
                >
                  <Icon name="close" size={18} />
                  <span>ยกเลิก</span>
                </button>
              }
              title="ยกเลิกการจองหรือไม่?"
              description={
                <div className="space-y-1">
                  {customer}
                  <p>
                    เมื่อยืนยันแล้ว คิวนี้จะถูกปลดออกและเปิดให้ลูกค้าท่านอื่นจองแทนได้
                  </p>
                </div>
              }
              confirmLabel="ยกเลิกการจอง"
              cancelLabel="ไม่"
              destructive
              onConfirm={() => cancelBookingByShopAction(booking.id)}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

const ACTION_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-label-md font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const COMPLETE_STYLE =
  "bg-success text-on-success hover:opacity-90 focus-visible:ring-success";

const CANCEL_STYLE =
  "border-2 border-outline-variant text-on-surface-variant hover:border-error hover:bg-error/5 hover:text-error focus-visible:ring-error";

const STATUS_CHIP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
};

/**
 * Cancelled-status chip label, specialised by who cancelled. Legacy rows with
 * an unknown source (cancelled_by = null) fall back to the plain "ยกเลิก".
 */
function cancelChipLabel(by: CancelledBy | null): string {
  if (by === "customer") return "ลูกค้ายกเลิก";
  if (by === "shop") return "ร้านยกเลิก";
  return "ยกเลิก";
}
