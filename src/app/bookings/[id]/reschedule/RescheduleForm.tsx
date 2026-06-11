"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/cn";
import {
  evaluateSlots,
  eachDateInWindow,
  type BookingContext,
} from "@/lib/booking/slot-math";
import { getBangkokNow, getBangkokToday } from "@/lib/time/bangkok";
import { rescheduleBookingAction, type RescheduleState } from "./actions";

/**
 * OPP-04 — date/time picker for rescheduling an existing booking. The service +
 * staff are LOCKED (set by the original booking); the customer only changes the
 * date and slot. Availability is computed with the same pure slot-math the
 * booking form and the server validator share, filtered to the booking's staff
 * lane, so picker and server can't disagree.
 *
 * SRP: render + collect the new (date, slot); the move + its re-validation live
 * in the server action (DIP).
 */
const CLOCK_TICK_MS = 30_000;
type ClockNow = { date: string; timeHHMM: string };
type DayStatus = "closed" | "full" | "available";
type DayView = {
  dateYmd: string;
  dayOfWeek: number;
  dayOfMonth: number;
  month0: number;
  status: DayStatus;
};
type SlotView = { time: string; isAvailable: boolean; isCurrent: boolean };

export function RescheduleForm({
  bookingId,
  context,
  durationMinutes,
  staffId,
  currentDate,
  currentSlot,
}: {
  bookingId: string;
  context: BookingContext;
  durationMinutes: number;
  /** Locked staff lane; null = single-queue shop. */
  staffId: string | null;
  serviceName: string | null;
  staffName: string | null;
  currentDate: string;
  currentSlot: string;
}) {
  const [now, setNow] = useState<ClockNow>(() => ({
    date: context.nowDate,
    timeHHMM: context.nowTimeHHMM,
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const timeSectionRef = useRef<HTMLElement>(null);
  const identitySectionRef = useRef<HTMLElement>(null);
  const [state, formAction, pending] = useActionState<RescheduleState, FormData>(
    rescheduleBookingAction,
    null,
  );

  // Live clock so today's past slots disable themselves while the page sits open.
  useEffect(() => {
    const update = () => {
      const date = getBangkokToday();
      const { timeHHMM } = getBangkokNow();
      setNow((prev) =>
        prev.date === date && prev.timeHHMM === timeHHMM
          ? prev
          : { date, timeHHMM },
      );
    };
    update();
    const id = window.setInterval(update, CLOCK_TICK_MS);
    const onVis = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Step-by-step guidance: after a date is picked, slide to the time picker;
  // after a slot is picked, slide to identity confirmation. Keeps the next
  // action in view on mobile without the customer hunting for it.
  useEffect(() => {
    if (!selectedDate) return;
    timeSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedSlot) return;
    identitySectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedSlot]);

  // Capacity + filter for the LOCKED staff lane: a specific staff is one line;
  // a single-queue shop uses the shop capacity with no filter.
  const { capacity, staffFilter } = useMemo(() => {
    if (staffId) {
      return {
        capacity: 1,
        staffFilter: new Set([staffId]) as ReadonlySet<string>,
      };
    }
    return {
      capacity: context.capacity,
      staffFilter: null as ReadonlySet<string> | null,
    };
  }, [staffId, context.capacity]);

  const windowDays = useMemo(
    () => eachDateInWindow(context.windowStart, context.windowEnd),
    [context.windowStart, context.windowEnd],
  );

  const days: DayView[] = useMemo(
    () =>
      windowDays.map(({ dateYmd, dayOfWeek }) => {
        const [, m, d] = dateYmd.split("-").map(Number);
        const h = context.hours[dayOfWeek];
        const isOpen = Boolean(h?.isOpen && h.openTime && h.closeTime);
        let status: DayStatus = "closed";
        if (isOpen) {
          const avail = evaluateSlots({
            openTime: h!.openTime!,
            closeTime: h!.closeTime!,
            durationMinutes,
            date: dateYmd,
            intervals: context.bookedIntervals,
            capacity,
            isToday: dateYmd === now.date,
            nowHHMM: now.timeHHMM,
            staffIdFilter: staffFilter,
          });
          status = avail.some((s) => s.isAvailable) ? "available" : "full";
        }
        return { dateYmd, dayOfWeek, dayOfMonth: d, month0: m - 1, status };
      }),
    [windowDays, context.hours, context.bookedIntervals, durationMinutes, capacity, staffFilter, now],
  );

  const selectedDay = days.find((d) => d.dateYmd === selectedDate) ?? null;

  const slots: SlotView[] = useMemo(() => {
    if (!selectedDay || selectedDay.status === "closed") return [];
    const h = context.hours[selectedDay.dayOfWeek];
    if (!h?.isOpen || !h.openTime || !h.closeTime) return [];
    return evaluateSlots({
      openTime: h.openTime,
      closeTime: h.closeTime,
      durationMinutes,
      date: selectedDay.dateYmd,
      intervals: context.bookedIntervals,
      capacity,
      isToday: selectedDay.dateYmd === now.date,
      nowHHMM: now.timeHHMM,
      staffIdFilter: staffFilter,
    }).map((s) => {
      // The booking's own slot is excluded from busy intervals (so it isn't
      // counted against the move), which would otherwise make it look free.
      // A reschedule must land on a DIFFERENT time, so lock the original slot.
      const isCurrent =
        selectedDay.dateYmd === currentDate && s.time === currentSlot;
      return {
        time: s.time,
        isAvailable: s.isAvailable && !isCurrent,
        isCurrent,
      };
    });
  }, [selectedDay, context.hours, context.bookedIntervals, durationMinutes, capacity, staffFilter, now, currentDate, currentSlot]);

  const isUnchanged =
    selectedDate === currentDate && selectedSlot === currentSlot;
  const slotIsAvailable = slots.some(
    (s) => s.time === selectedSlot && s.isAvailable,
  );
  const phoneValid = /^[0-9]{9,10}$/u.test(phone);
  const canSubmit =
    Boolean(selectedDate) &&
    Boolean(selectedSlot) &&
    slotIsAvailable &&
    !isUnchanged &&
    phoneValid;

  const handleSelectDate = (dateYmd: string) => {
    setSelectedDate(dateYmd);
    setSelectedSlot(null);
  };

  return (
    <form action={formAction} className="space-y-stack-md">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="date" value={selectedDate ?? ""} />
      <input type="hidden" name="slotTime" value={selectedSlot ?? ""} />

      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-display text-headline-md text-on-surface">
          เลือกวันใหม่
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {days.map((day) => (
            <DateChip
              key={day.dateYmd}
              day={day}
              selected={day.dateYmd === selectedDate}
              onClick={() => handleSelectDate(day.dateYmd)}
            />
          ))}
        </div>
      </section>

      <section
        ref={timeSectionRef}
        className="scroll-mt-4 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4"
      >
        <h2 className="font-display text-headline-md text-on-surface">
          เลือกเวลาใหม่
        </h2>
        {!selectedDate ? (
          <EmptyHint icon="event" message="เลือกวันก่อน" />
        ) : selectedDay?.status === "closed" ? (
          <EmptyHint icon="event_busy" message="ร้านปิดในวันนี้" />
        ) : slots.length === 0 ? (
          <EmptyHint icon="schedule" message="ไม่มีรอบให้บริการในวันนี้" />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slots.map((s) => (
              <SlotButton
                key={s.time}
                slot={s}
                selected={s.time === selectedSlot}
                onClick={() => setSelectedSlot(s.time)}
              />
            ))}
          </div>
        )}
      </section>

      <section
        ref={identitySectionRef}
        className="scroll-mt-4 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4"
      >
        <h2 className="font-display text-headline-md text-on-surface">
          ยืนยันตัวตน
        </h2>
        <PhoneInput
          name="phone"
          label="เบอร์โทรที่ใช้จอง"
          required
          value={phone}
          onChange={setPhone}
          placeholder="08X-XXX-XXXX"
          helperText="กรอกเบอร์เดียวกับที่ใช้จองคิวนี้ เพื่อยืนยันว่าเป็นเจ้าของคิว"
          disabled={pending}
        />
      </section>

      {state && !state.ok ? (
        <div className="bg-error-container/30 border border-error/20 text-on-error-container rounded-xl p-4 flex items-start gap-3">
          <Icon name="error" className="text-error mt-0.5" />
          <p className="text-body-md">{state.message}</p>
        </div>
      ) : null}

      <div aria-hidden className="h-2 md:hidden" />

      <div className="sticky bottom-0 -mx-4 md:mx-0 px-4 md:px-0 py-4 bg-background/95 backdrop-blur border-t border-outline-variant md:bg-transparent md:border-0 md:backdrop-blur-0 md:py-0">
        <Button
          type="submit"
          size="xl"
          rounded="full"
          fullWidth
          disabled={!canSubmit || pending}
          iconLeft={
            pending ? (
              <Icon name="progress_activity" className="animate-spin" />
            ) : (
              <Icon name="edit_calendar" />
            )
          }
        >
          {pending ? "กำลังเลื่อนเวลา..." : "ยืนยันการเลื่อนเวลา"}
        </Button>
      </div>
    </form>
  );
}

function DateChip({
  day,
  selected,
  onClick,
}: {
  day: DayView;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled = day.status !== "available";
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl py-2.5 px-1 text-center transition-all border-2",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : day.status === "closed"
            ? "bg-surface-container-low/40 text-on-surface-variant/50 border-transparent cursor-not-allowed"
            : day.status === "full"
              ? "bg-surface-container-low text-on-surface-variant border-transparent cursor-not-allowed"
              : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
    >
      <span className="text-label-sm font-bold uppercase tracking-widest">
        {THAI_DAY_SHORT[day.dayOfWeek]}
      </span>
      <span className="font-display text-headline-md leading-none">
        {day.dayOfMonth}
      </span>
      <span className="text-label-sm opacity-80">
        {THAI_MONTH_SHORT[day.month0]}
      </span>
      {!selected ? (
        <span
          className={cn(
            "text-label-sm uppercase tracking-widest font-bold mt-1",
            day.status === "closed" && "text-on-surface-variant/60",
            day.status === "full" && "text-error",
            day.status === "available" && "text-primary/70",
          )}
        >
          {DAY_STATUS_LABEL[day.status]}
        </span>
      ) : null}
    </button>
  );
}

const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  closed: "ปิด",
  full: "เต็ม",
  available: "ว่าง",
};

function SlotButton({
  slot,
  selected,
  onClick,
}: {
  slot: SlotView;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled = !slot.isAvailable;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={slot.isCurrent ? `${slot.time} — เวลาปัจจุบัน` : undefined}
      title={slot.isCurrent ? "เวลาปัจจุบันของคุณ" : undefined}
      className={cn(
        "rounded-full px-3 py-2.5 text-label-md font-semibold border-2 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : slot.isCurrent
            ? "bg-secondary-container/40 text-on-secondary-container/70 border-secondary/30 cursor-not-allowed"
            : disabled
              ? "bg-surface-container-low/40 text-on-surface-variant/50 border-transparent cursor-not-allowed line-through"
              : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
    >
      {slot.time}
    </button>
  );
}

function EmptyHint({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-on-surface-variant">
      <Icon name={icon} size={32} className="opacity-60" />
      <p className="text-body-md">{message}</p>
    </div>
  );
}

const THAI_DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
