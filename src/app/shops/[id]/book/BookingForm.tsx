"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  generateSlots,
  type BookingContext,
} from "@/lib/booking/slot-math";
import { getBangkokNow, getBangkokToday } from "@/lib/time/bangkok";
import { createBookingAction, type CreateBookingState } from "./actions";

/** Live "now" in Bangkok, re-checked on the client so the picker keeps up with
 *  the wall clock while the page sits open. */
const CLOCK_TICK_MS = 30_000;
type ClockNow = { date: string; timeHHMM: string };

/**
 * Customer-facing booking form. Single client component because every input
 * gates the next step (no point bouncing back to the server for each):
 *
 *   1. Date picker — only open days are clickable
 *   2. Slot grid — only slots for the picked date are shown, taken/past
 *      slots are disabled
 *   3. Name + phone — appears once a slot is locked in
 *   4. Submit — disabled until everything's valid
 *
 * SRP: render + collect local state. The actual create-booking work and
 * its re-validation live in the server action (DIP).
 */
export function BookingForm({
  context,
  defaultName = "",
  defaultPhone = "",
}: {
  context: BookingContext;
  /** Pre-fills the booker fields for a signed-in customer (still editable, so
   *  they can book on someone else's behalf). */
  defaultName?: string;
  defaultPhone?: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  // Seed from the server snapshot so SSR and first client render agree (no
  // hydration mismatch); the effect below then keeps it live on the client.
  const [now, setNow] = useState<ClockNow>(() => ({
    date: context.nowDate,
    timeHHMM: context.nowTimeHHMM,
  }));
  // Slots this client learned were taken *after* page load — specifically a
  // slot the server rejected with `slot_taken` because another customer won
  // the race by a hair. Disabling it locally stops it being re-picked.
  const [locallyTaken, setLocallyTaken] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const [state, formAction, pending] = useActionState<
    CreateBookingState,
    FormData
  >(createBookingAction, null);

  // Fold a server `slot_taken` rejection into the local taken-set so the grid
  // disables that exact slot. Reacting to the settled action result — a one-off
  // server signal with no derived-state equivalent.
  useEffect(() => {
    if (!state || state.code !== "slot_taken" || !state.takenSlot) return;
    const key = takenKey(state.takenSlot.date, state.takenSlot.slotTime);
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocallyTaken((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state]);

  // Live clock: advance "now" on an interval and on tab refocus so past slots
  // disable themselves in real time. Only updates state when the minute (or
  // day) actually changes, so memos don't churn every tick.
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
    update(); // sync to the real client clock immediately
    const id = window.setInterval(update, CLOCK_TICK_MS);
    const onVisibility = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const days = useMemo(
    () => buildDays(context, now, locallyTaken),
    [context, now, locallyTaken],
  );
  const selectedDay = days.find((d) => d.dateYmd === selectedDate) ?? null;

  const slots = useMemo(() => {
    if (!selectedDay || selectedDay.status === "closed") return [];
    return computeSlotsForDay(selectedDay, context, now, locallyTaken);
  }, [selectedDay, context, now, locallyTaken]);

  // A slot the customer picked that has since slipped into the past is treated
  // as no selection — derived during render, not stored, so the step-3 form
  // collapses, submit disables, and a notice shows WITHOUT a state-syncing
  // effect. The server would reject it anyway; this just fails early.
  const selectedSlotExpired =
    selectedSlot !== null &&
    selectedDate === now.date &&
    selectedSlot <= now.timeHHMM;
  // A slot just lost to another customer (server `slot_taken`) is treated as no
  // selection — step 3 collapses and submit disables until a fresh pick.
  const selectedSlotTaken =
    selectedSlot !== null &&
    selectedDate !== null &&
    locallyTaken.has(takenKey(selectedDate, selectedSlot));
  const activeSlot =
    selectedSlotExpired || selectedSlotTaken ? null : selectedSlot;

  const canSubmit =
    Boolean(selectedDate) &&
    Boolean(activeSlot) &&
    name.trim().length > 0 &&
    /^[0-9]{9,10}$/u.test(phone);

  const timeSectionRef = useRef<HTMLDivElement>(null);
  const infoSectionRef = useRef<HTMLDivElement>(null);

  // Smooth-scroll a step's section to the top once React has committed the
  // DOM (rAF), so each pick leads the eye to the next step.
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSelectDate = (dateYmd: string) => {
    setSelectedDate(dateYmd);
    setSelectedSlot(null);
    scrollToSection(timeSectionRef);
  };

  const handleSelectSlot = (time: string) => {
    setSelectedSlot(time);
    scrollToSection(infoSectionRef);
  };

  return (
    <form action={formAction} className="space-y-stack-md">
      <input type="hidden" name="shopId" value={context.shop.id} />
      <input type="hidden" name="date" value={selectedDate ?? ""} />
      <input type="hidden" name="slotTime" value={activeSlot ?? ""} />

      <Section
        step={1}
        title="เลือกวัน"
        description="เลือกวันที่คุณต้องการเข้ารับบริการ"
      >
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {days.map((d) => (
            <DateChip
              key={d.dateYmd}
              day={d}
              selected={d.dateYmd === selectedDate}
              onClick={() => handleSelectDate(d.dateYmd)}
            />
          ))}
        </div>
      </Section>

      <div ref={timeSectionRef} className="scroll-mt-4">
      <Section
        step={2}
        title="เลือกเวลา"
        description={
          selectedDay?.status === "available"
            ? `บริการครั้งละ ${context.shop.serviceDurationMinutes} นาที`
            : "กรุณาเลือกวันที่เปิดบริการก่อน"
        }
      >
        {!selectedDate ? (
          <EmptyHint icon="event" message="ยังไม่ได้เลือกวัน" />
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
                selected={s.time === activeSlot}
                onClick={() => handleSelectSlot(s.time)}
              />
            ))}
          </div>
        )}
      </Section>
      </div>

      <div ref={infoSectionRef} className="scroll-mt-4">
      <Section
        step={3}
        title="ข้อมูลผู้จอง"
        description="ใช้สำหรับยืนยันการจองที่ร้าน"
      >
        {!activeSlot ? (
          <EmptyHint icon="person" message="เลือกเวลาแล้วจึงกรอกข้อมูล" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="customerName"
              label="ชื่อ"
              placeholder="ชื่อจริงหรือชื่อเล่น"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <PhoneInput
              name="customerPhone"
              label="เบอร์โทร"
              placeholder="0812345678"
              required
              value={phone}
              onChange={(digits) => setPhone(digits)}
              helperText="ใช้สำหรับยืนยันการจองที่หน้าร้าน"
            />
          </div>
        )}
      </Section>
      </div>

      {selectedSlotExpired ? (
        <div className="bg-secondary-container/30 border border-secondary/20 text-on-secondary-container rounded-xl p-4 flex items-start gap-3">
          <Icon name="schedule" className="text-secondary mt-0.5" />
          <p className="text-body-md">
            ช่วงเวลา {selectedSlot} น. ผ่านไปแล้ว กรุณาเลือกเวลาใหม่
          </p>
        </div>
      ) : null}

      {state && !state.ok ? (
        <div className="bg-error-container/30 border border-error/20 text-on-error-container rounded-xl p-4 flex items-start gap-3">
          <Icon name="error" className="text-error mt-0.5" />
          <p className="text-body-md">
            {state.code === "slot_taken" && state.takenSlot
              ? `ช่วงเวลา ${state.takenSlot.slotTime} น. ถูกจองโดยลูกค้าอีกคนแล้ว กรุณาเลือกใหม่`
              : state.message}
          </p>
        </div>
      ) : null}

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
              <Icon name="event_available" />
            )
          }
        >
          {pending ? "กำลังจองคิว..." : "ยืนยันการจอง"}
        </Button>
      </div>
    </form>
  );
}

// ----- Subcomponents ------------------------------------------------------

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4">
      <header className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-md shrink-0">
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-headline-md text-on-surface">
            {title}
          </h2>
          {description ? (
            <p className="text-label-md text-on-surface-variant mt-0.5">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function DateChip({
  day,
  selected,
  onClick,
}: {
  day: BookableDay;
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
            "text-[10px] uppercase tracking-widest font-bold mt-1",
            day.status === "closed" && "text-on-surface-variant/60",
            day.status === "full" && "text-error",
            day.status === "available" && "text-primary/70",
          )}
        >
          {STATUS_LABEL[day.status]}
        </span>
      ) : null}
    </button>
  );
}

const STATUS_LABEL: Record<DayStatus, string> = {
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
      className={cn(
        "rounded-full px-3 py-2.5 text-label-md font-semibold border-2 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : disabled
            ? "bg-surface-container-low/40 text-on-surface-variant/50 border-transparent cursor-not-allowed line-through"
            : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
      title={
        slot.isTaken
          ? "ช่วงเวลานี้ถูกจองแล้ว"
          : slot.isPast
            ? "ช่วงเวลานี้ผ่านไปแล้ว"
            : undefined
      }
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

// ----- Pure helpers (kept inside the client module so the slot derivation
// stays close to where the picker uses it) ---------------------------------

type DayStatus = "closed" | "full" | "available";

type BookableDay = {
  dateYmd: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dayOfMonth: number;
  month0: number; // 0..11
  status: DayStatus;
};

type SlotView = {
  time: string;
  isAvailable: boolean;
  isTaken: boolean;
  isPast: boolean;
};

/** Stable key for a (date, slotTime) pair used in the locally-taken set. */
function takenKey(date: string, slotTime: string): string {
  return `${date} ${slotTime}`;
}

/** Fold any locally-known taken slots for `date` into the `taken` set. */
function addLocalTaken(
  taken: Set<string>,
  locallyTaken: ReadonlySet<string>,
  date: string,
): void {
  const prefix = `${date} `;
  for (const key of locallyTaken) {
    if (key.startsWith(prefix)) taken.add(key.slice(prefix.length));
  }
}

function buildDays(
  context: BookingContext,
  now: ClockNow,
  locallyTaken: ReadonlySet<string>,
): BookableDay[] {
  const out: BookableDay[] = [];
  let cursor = context.windowStart;
  while (cursor <= context.windowEnd) {
    const [y, m, d] = cursor.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay() as
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;
    const hours = context.hours[dayOfWeek];
    const isOpen = Boolean(hours?.isOpen && hours.openTime && hours.closeTime);

    let status: DayStatus;
    if (!isOpen) {
      status = "closed";
    } else {
      const times = generateSlots(
        hours!.openTime!,
        hours!.closeTime!,
        context.shop.serviceDurationMinutes,
      );
      const taken = new Set(
        context.takenSlots
          .filter((t) => t.date === cursor)
          .map((t) => t.slotTime),
      );
      addLocalTaken(taken, locallyTaken, cursor);
      const isToday = cursor === now.date;
      const hasAvailable = times.some(
        (t) => !taken.has(t) && !(isToday && t <= now.timeHHMM),
      );
      status = hasAvailable ? "available" : "full";
    }

    out.push({
      dateYmd: cursor,
      dayOfWeek,
      dayOfMonth: d,
      month0: m - 1,
      status,
    });
    cursor = addDays(cursor, 1);
  }
  return out;
}

function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function computeSlotsForDay(
  day: BookableDay,
  context: BookingContext,
  now: ClockNow,
  locallyTaken: ReadonlySet<string>,
): SlotView[] {
  const hours = context.hours[day.dayOfWeek];
  if (!hours?.isOpen || !hours.openTime || !hours.closeTime) return [];
  const times = generateSlots(
    hours.openTime,
    hours.closeTime,
    context.shop.serviceDurationMinutes,
  );
  const taken = new Set(
    context.takenSlots
      .filter((t) => t.date === day.dateYmd)
      .map((t) => t.slotTime),
  );
  addLocalTaken(taken, locallyTaken, day.dateYmd);
  const isToday = day.dateYmd === now.date;
  return times.map((t) => {
    const isTaken = taken.has(t);
    const isPast = isToday && t <= now.timeHHMM;
    return {
      time: t,
      isTaken,
      isPast,
      isAvailable: !isTaken && !isPast,
    };
  });
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
