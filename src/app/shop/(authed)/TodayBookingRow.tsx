"use client";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import type {
  BookingListItem,
  BookingStatus,
} from "@/lib/services/bookings";
import { markBookingCompleted } from "./bookings/actions";

/**
 * Compact row used by the shop dashboard's "การจองวันนี้" list. Confirmed
 * bookings are rendered as a button that opens a confirm dialog → on
 * confirm the row is marked as completed. Other statuses render as a
 * static row (no action possible).
 *
 * SRP: presentation + click-to-complete plumbing only. The actual status
 * transition + ownership check live in the server action.
 */
export function TodayBookingRow({
  booking,
  index,
}: {
  booking: BookingListItem;
  index: number;
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
        <RowInner booking={booking} />
      </li>
    );
  }

  return (
    <li className={cn("rounded-lg", striped && "bg-surface-container-low/50")}>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container focus:bg-surface-container focus:outline-none transition-colors text-left"
          >
            <RowInner booking={booking} />
          </button>
        }
        title="ทำเครื่องหมายว่าเสร็จสิ้น?"
        description={
          <div className="space-y-1">
            <p>
              ลูกค้า{" "}
              <span className="font-bold text-on-surface">
                {booking.customerName}
              </span>{" "}
              เวลา{" "}
              <span className="font-bold text-on-surface">
                {booking.slotTime} น.
              </span>
            </p>
            <p>
              เมื่อยืนยันแล้ว สถานะของรายการนี้จะเปลี่ยนเป็น &ldquo;เสร็จสิ้น&rdquo;
            </p>
          </div>
        }
        confirmLabel="เสร็จสิ้น"
        cancelLabel="ยกเลิก"
        onConfirm={() => markBookingCompleted(booking.id)}
      />
    </li>
  );
}

function RowInner({ booking }: { booking: BookingListItem }) {
  const chip = STATUS_CHIP[booking.status];
  return (
    <>
      <div className="w-16 text-center font-display text-headline-md text-primary">
        {booking.slotTime}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-md text-on-surface truncate">
          {booking.customerName}
        </p>
        <p className="text-label-md text-on-surface-variant">
          ครั้งละ {booking.serviceDurationMinutes} นาที
        </p>
      </div>
      <Chip variant={chip.variant} size="sm">
        {chip.label}
      </Chip>
    </>
  );
}

const STATUS_CHIP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "ยืนยันแล้ว", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
  no_show: { label: "ไม่มาตามนัด", variant: "danger" },
};
