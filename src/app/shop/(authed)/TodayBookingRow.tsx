"use client";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type {
  BookingListItem,
  BookingStatus,
} from "@/lib/services/bookings";
import {
  cancelBookingByShopAction,
  markBookingCompleted,
  markBookingNoShowAction,
} from "./bookings/actions";

/**
 * Compact row used by the shop dashboard's "การจองวันนี้" list. Confirmed
 * bookings expose two explicit, equally-discoverable actions: a filled
 * "เสร็จสิ้น" button (mark completed) and an outlined ✕ button (cancel the
 * queue). Other statuses render as a static row with just a status chip.
 *
 * SRP: presentation + action plumbing only. The actual status transitions
 * + ownership checks live in the server actions / service layer.
 */
export function TodayBookingRow({
  booking,
  index,
  noShowCount = 0,
}: {
  booking: BookingListItem;
  index: number;
  noShowCount?: number;
}) {
  // Zebra striping for readability: every other row gets a faint fill.
  const striped = index % 2 === 1;

  if (booking.status !== "confirmed") {
    return (
      <li
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          striped && "bg-surface-container-low/50",
        )}
      >
        <RowInner booking={booking} noShowCount={noShowCount} />
      </li>
    );
  }

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
        "flex items-center gap-3 p-3 rounded-lg",
        striped && "bg-surface-container-low/50",
      )}
    >
      <RowInner booking={booking} withChip={false} noShowCount={noShowCount} />

      <div className="flex items-center gap-2 shrink-0">
        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-label={`ทำเครื่องหมายว่าเสร็จสิ้น ${booking.customerName}`}
              className="inline-flex items-center justify-center size-9 rounded-full bg-success text-on-success hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 active:scale-[0.98] transition-all"
            >
              <Icon name="check" size={18} />
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
              aria-label={`ทำเครื่องหมายว่าไม่มาตามนัด ${booking.customerName}`}
              className="inline-flex items-center justify-center size-9 rounded-full border-2 border-outline-variant text-on-surface-variant hover:border-tertiary hover:text-tertiary hover:bg-tertiary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 active:scale-[0.98] transition-all"
            >
              <Icon name="event_busy" size={18} />
            </button>
          }
          title="ทำเครื่องหมายว่าไม่มาตามนัด?"
          description={
            <div className="space-y-1">
              {customer}
              <p>
                เมื่อยืนยันแล้ว คิวนี้จะถูกบันทึกว่าลูกค้าไม่มาตามนัด
                และนับรวมในประวัติการไม่มาของลูกค้ารายนี้ที่ร้านของคุณ
              </p>
            </div>
          }
          confirmLabel="ไม่มาตามนัด"
          cancelLabel="ปิด"
          onConfirm={() => markBookingNoShowAction(booking.id)}
        />

        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-label={`ยกเลิกการจองของ ${booking.customerName}`}
              className="inline-flex items-center justify-center size-9 rounded-full border-2 border-outline-variant text-on-surface-variant hover:border-error hover:text-error hover:bg-error/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 active:scale-[0.98] transition-all"
            >
              <Icon name="close" size={18} />
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
    </li>
  );
}

function RowInner({
  booking,
  withChip = true,
  noShowCount = 0,
}: {
  booking: BookingListItem;
  withChip?: boolean;
  noShowCount?: number;
}) {
  const chip = STATUS_CHIP[booking.status];
  return (
    <>
      <div className="shrink-0 self-stretch flex items-center justify-center min-w-[3.75rem] px-2.5 rounded-xl bg-primary/10 text-primary font-display text-headline-md font-bold">
        {booking.slotTime}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-md text-on-surface font-semibold truncate">
          {booking.customerName}
        </p>
        {booking.status === "confirmed" &&
        booking.customerPhone &&
        noShowCount > 0 ? (
          <Chip
            variant="danger"
            size="sm"
            className="mt-0.5"
            iconLeft={<Icon name="event_busy" size={12} />}
          >
            ไม่มาตามนัด {noShowCount} ครั้ง
          </Chip>
        ) : null}
        <p className="text-label-md text-on-surface-variant truncate mt-0.5">
          {booking.serviceName ?? "บริการ"} · {booking.serviceDurationMinutes} นาที
        </p>
        {booking.staffName ? (
          <span className="inline-flex max-w-full items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-primary-container/15 text-primary text-label-sm font-semibold">
            <Icon name="person" size={13} className="shrink-0" />
            <span className="truncate">{booking.staffName}</span>
          </span>
        ) : null}
      </div>
      {withChip ? (
        <Chip variant={chip.variant} size="sm">
          {chip.label}
        </Chip>
      ) : null}
    </>
  );
}

const STATUS_CHIP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" | "tertiary" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
  // Gold (tertiary), not red — distinguishes "didn't show" from shop "ยกเลิก",
  // and matches the gold no-show action button.
  no_show: { label: "ไม่มาตามนัด", variant: "tertiary" },
};
