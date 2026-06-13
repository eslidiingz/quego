"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/baht";
import {
  evaluateSlots,
  eachDateInWindow,
  findSoonestSlot,
  nextYmd,
  type BookingContext,
  type BookingService,
  type StaffOption,
  type SoonestSlot,
} from "@/lib/booking/slot-math";
import { getBangkokNow, getBangkokToday } from "@/lib/time/bangkok";
import { isValidThaiPhone } from "@/lib/validation/phone";
import { createBookingAction, type CreateBookingState } from "./actions";
import { WaitlistPanel } from "./WaitlistPanel";

/** Live "now" in Bangkok, re-checked on the client so the picker keeps up with
 *  the wall clock while the page sits open. */
const CLOCK_TICK_MS = 30_000;
type ClockNow = { date: string; timeHHMM: string };

/**
 * Customer-facing booking form. Single client component because every input
 * gates the next step (no point bouncing back to the server for each):
 *
 *   1. Service picker — duration & price differ per service
 *   2. Date picker — only open days are clickable
 *   3. Slot grid — only slots for the picked service+date are shown; taken/past
 *      slots are disabled
 *   4. Name + phone — appears once a slot is locked in
 *
 * The implicit single-service fallback (a shop with no defined services) skips
 * step 1 and the form collapses to the classic date → time → info flow.
 *
 * SRP: render + collect local state. The actual create-booking work and its
 * re-validation live in the server action (DIP).
 */
export function BookingForm({
  context,
  defaultName = "",
  defaultPhone = "",
  prefill,
  lineConnected,
  showCustomerNav = false,
}: {
  context: BookingContext;
  /** Pre-fills the booker fields for a signed-in customer (still editable, so
   *  they can book on someone else's behalf). */
  defaultName?: string;
  defaultPhone?: string;
  /** OPP-05: waitlist "จองเลย" deep-link prefill (service/staff/date), validated
   *  against the live context below so a stale/invalid link degrades gracefully. */
  prefill?: { serviceId?: string; staffId?: string; date?: string };
  /** Whether the signed-in customer has LINE connected — drives the waitlist
   *  panel's "connect LINE" hint. Undefined for anonymous visitors. */
  lineConnected?: boolean;
  /** When the customer bottom tab bar is showing (signed-in customer on mobile),
   *  lift the sticky submit bar above it so the CTA isn't hidden behind it. */
  showCustomerNav?: boolean;
}) {
  // Show the service step only when there's a real choice to make: more than
  // one service, or a single *named* one (carries a price worth surfacing).
  // The implicit fallback service (id === null, alone) stays hidden so legacy
  // shops keep the original date → time → info flow.
  const services = context.services;
  const showServiceStep =
    services.length > 1 || (services.length === 1 && services[0].id !== null);
  const autoService = showServiceStep ? null : (services[0] ?? null);

  // OPP-05: resolve the deep-link prefill against the live context. An unknown
  // service falls back to the normal default; an out-of-window date or a staff
  // who can't do the service is simply ignored.
  const prefillService =
    prefill?.serviceId != null
      ? (services.find((s) => s.id === prefill.serviceId) ?? null)
      : null;
  const initialServiceKey = prefillService
    ? serviceKey(prefillService)
    : autoService
      ? serviceKey(autoService)
      : null;
  const initialStaffId =
    prefill?.staffId && prefillService?.staffIds?.includes(prefill.staffId)
      ? prefill.staffId
      : null;
  // Only pre-select the date when a service is actually selected at mount
  // (prefill or single-service auto). A stale link whose service no longer
  // exists must not leave a phantom date with no service picked.
  const initialDate =
    initialServiceKey &&
    prefill?.date &&
    prefill.date >= context.windowStart &&
    prefill.date <= context.windowEnd
      ? prefill.date
      : null;

  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(
    initialServiceKey,
  );
  // Customer's chosen staff member; null = "ใครก็ได้" (any capable staff).
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(initialStaffId);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
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

  const selectedService = useMemo(
    () => services.find((s) => serviceKey(s) === selectedServiceKey) ?? null,
    [services, selectedServiceKey],
  );
  const duration = selectedService?.durationMinutes ?? null;

  // Staff capable of the selected service. `staffIds === null` means a
  // single-queue shop (no staff configured) — the staff step is hidden and
  // the legacy capacity model applies. Otherwise only listed staff appear.
  const serviceStaffIds = selectedService?.staffIds ?? null;
  const capableStaff = useMemo<StaffOption[]>(() => {
    if (serviceStaffIds === null) return [];
    const allow = new Set(serviceStaffIds);
    return context.staff.filter((s) => allow.has(s.id));
  }, [context.staff, serviceStaffIds]);
  const showStaffStep = serviceStaffIds !== null && capableStaff.length > 0;

  // Slot-availability inputs depend on the staff choice:
  //   • single-queue (no staff)   → context.capacity, no staff filter
  //   • staffed, "ใครก็ได้"        → capacity = # capable staff, filter = them
  //   • staffed, specific staff    → capacity 1, filter = that one staff
  const { effectiveCapacity, staffFilter } = useMemo(() => {
    if (serviceStaffIds === null) {
      return { effectiveCapacity: context.capacity, staffFilter: null as ReadonlySet<string> | null };
    }
    if (selectedStaffId) {
      return { effectiveCapacity: 1, staffFilter: new Set([selectedStaffId]) as ReadonlySet<string> };
    }
    return {
      effectiveCapacity: Math.max(capableStaff.length, 1),
      staffFilter: new Set(capableStaff.map((s) => s.id)) as ReadonlySet<string>,
    };
  }, [serviceStaffIds, selectedStaffId, capableStaff, context.capacity]);

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

  // The bare date list for the window — date + day-of-week only, independent of
  // any staff choice. Both the date chips and the soonest-slot scan walk it, so
  // it's memoised once and reused rather than rebuilt per staff option.
  const windowDays = useMemo(
    () => eachDateInWindow(context.windowStart, context.windowEnd),
    [context.windowStart, context.windowEnd],
  );

  const days = useMemo(
    () =>
      duration == null
        ? []
        : buildDays(context, windowDays, duration, now, locallyTaken, effectiveCapacity, staffFilter),
    [context, windowDays, duration, now, locallyTaken, effectiveCapacity, staffFilter],
  );
  const selectedDay = days.find((d) => d.dateYmd === selectedDate) ?? null;

  // OPP-11a — soonest free opening per staff choice, so the picker can show
  // that "ใครก็ได้" (capacity = #capable staff) frees up earlier than pinning
  // one person (capacity = 1). Keyed by staff id, with `null` = "ใครก็ได้".
  // Built off the staff-independent `windowDays`, so selecting a staff doesn't
  // recompute every option's soonest.
  const soonestByStaff = useMemo(() => {
    if (!showStaffStep || duration == null) return null;
    const common = {
      days: windowDays,
      hours: context.hours,
      durationMinutes: duration,
      intervals: context.bookedIntervals,
      nowDate: now.date,
      nowHHMM: now.timeHHMM,
      takenKeys: locallyTaken,
    };
    const byStaff = new Map<string | null, SoonestSlot | null>();
    byStaff.set(
      null,
      findSoonestSlot({
        ...common,
        capacity: Math.max(capableStaff.length, 1),
        staffIdFilter: new Set(capableStaff.map((s) => s.id)),
      }),
    );
    for (const member of capableStaff) {
      byStaff.set(
        member.id,
        findSoonestSlot({ ...common, capacity: 1, staffIdFilter: new Set([member.id]) }),
      );
    }
    return byStaff;
  }, [
    showStaffStep,
    duration,
    windowDays,
    context.hours,
    context.bookedIntervals,
    now.date,
    now.timeHHMM,
    locallyTaken,
    capableStaff,
  ]);

  // "ใครก็ได้" genuinely saves time when its soonest beats every individual's
  // (or some individual has no opening at all). Only then do we flag it faster —
  // when every staff is equally free right now, the hint would be misleading.
  const anyStaffSoonest = soonestByStaff?.get(null) ?? null;
  const anyStaffIsFaster =
    anyStaffSoonest != null &&
    capableStaff.some((m) => {
      const s = soonestByStaff?.get(m.id) ?? null;
      return s == null || soonestKey(s) > soonestKey(anyStaffSoonest);
    });

  const slots = useMemo(() => {
    if (duration == null || !selectedDay || selectedDay.status === "closed")
      return [];
    return computeSlotsForDay(
      selectedDay,
      context,
      duration,
      now,
      locallyTaken,
      effectiveCapacity,
      staffFilter,
    );
  }, [selectedDay, context, duration, now, locallyTaken, effectiveCapacity, staffFilter]);

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
    Boolean(selectedService) &&
    Boolean(selectedDate) &&
    Boolean(activeSlot) &&
    name.trim().length > 0 &&
    isValidThaiPhone(phone);

  const staffSectionRef = useRef<HTMLDivElement>(null);
  const dateSectionRef = useRef<HTMLDivElement>(null);
  const timeSectionRef = useRef<HTMLDivElement>(null);
  const infoSectionRef = useRef<HTMLDivElement>(null);

  // Smooth-scroll a step's section to the top once React has committed the
  // DOM (rAF), so each pick leads the eye to the next step.
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSelectService = (svc: BookingService) => {
    setSelectedServiceKey(serviceKey(svc));
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    // Scroll to the staff step when this service has assignable staff,
    // otherwise straight to the date step.
    const willShowStaff = svc.staffIds !== null && svc.staffIds.length > 0;
    scrollToSection(willShowStaff ? staffSectionRef : dateSectionRef);
  };

  const handleSelectStaff = (staffId: string | null) => {
    setSelectedStaffId(staffId);
    // Staff choice changes which slots are free — reset the downstream picks.
    setSelectedDate(null);
    setSelectedSlot(null);
    scrollToSection(dateSectionRef);
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

  // Step numbers shift as optional steps (service, staff) appear before the
  // date → time → info core.
  const staffStepNum = showServiceStep ? 2 : 1;
  const stepBase =
    (showServiceStep ? 1 : 0) + (showStaffStep ? 1 : 0); // steps before "date"

  return (
    <form action={formAction} className="space-y-stack-md">
      <input type="hidden" name="shopId" value={context.shop.id} />
      <input type="hidden" name="serviceId" value={selectedService?.id ?? ""} />
      <input
        type="hidden"
        name="preferredStaffId"
        value={showStaffStep ? (selectedStaffId ?? "") : ""}
      />
      <input type="hidden" name="date" value={selectedDate ?? ""} />
      <input type="hidden" name="slotTime" value={activeSlot ?? ""} />

      {showServiceStep ? (
        <Section
          step={1}
          title="เลือกบริการ"
          description="เลือกบริการที่ต้องการ"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {services.map((svc) => (
              <ServiceCard
                key={serviceKey(svc)}
                service={svc}
                selected={serviceKey(svc) === selectedServiceKey}
                onClick={() => handleSelectService(svc)}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {showStaffStep ? (
        <div ref={staffSectionRef} className="scroll-mt-4">
          <Section
            step={staffStepNum}
            title="เลือกผู้ให้บริการ"
            description="เลือกช่างที่ต้องการ หรือให้ร้านจัดให้ — คิวว่างเร็วสุดของแต่ละตัวเลือกแสดงไว้ด้านล่าง"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <StaffCard
                name="ใครก็ได้"
                subtitle="ร้านจัดช่างที่ว่างให้"
                icon="groups"
                selected={selectedStaffId === null}
                onClick={() => handleSelectStaff(null)}
                soonest={anyStaffSoonest}
                today={now.date}
                fastest={anyStaffIsFaster}
              />
              {capableStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  name={member.name}
                  subtitle={member.role ?? undefined}
                  icon="person"
                  selected={selectedStaffId === member.id}
                  onClick={() => handleSelectStaff(member.id)}
                  soonest={soonestByStaff?.get(member.id) ?? null}
                  today={now.date}
                />
              ))}
            </div>
          </Section>
        </div>
      ) : null}

      <div ref={dateSectionRef} className="scroll-mt-4">
        <Section
          step={stepBase + 1}
          title="เลือกวัน"
          description="เลือกวันที่คุณต้องการเข้ารับบริการ"
        >
          {!selectedService ? (
            <EmptyHint icon="design_services" message="เลือกบริการก่อน" />
          ) : (
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
          )}
        </Section>
      </div>

      <div ref={timeSectionRef} className="scroll-mt-4">
        <Section
          step={stepBase + 2}
          title="เลือกเวลา"
          description={
            selectedDay?.status === "available"
              ? `บริการครั้งละ ${selectedService?.durationMinutes} นาที`
              : selectedDay?.status === "full"
                ? "วันนี้คิวเต็ม — รับการแจ้งเตือนเมื่อมีคิวว่างได้"
                : "กรุณาเลือกวันที่เปิดบริการก่อน"
          }
        >
          {!selectedDate ? (
            <EmptyHint icon="event" message="ยังไม่ได้เลือกวัน" />
          ) : selectedDay?.status === "closed" ? (
            <EmptyHint icon="event_busy" message="ร้านปิดในวันนี้" />
          ) : selectedDay?.status === "full" ? (
            selectedService?.id ? (
              <WaitlistPanel
                // Fresh instance per target so a submit/error result (and the
                // typed name/phone) never bleed from one full date to another.
                key={`${selectedService.id}:${selectedStaffId ?? "any"}:${selectedDate}`}
                shopId={context.shop.id}
                serviceId={selectedService.id}
                serviceName={selectedService.name}
                preferredStaffId={showStaffStep ? selectedStaffId : null}
                staffLabel={
                  showStaffStep && selectedStaffId
                    ? (capableStaff.find((s) => s.id === selectedStaffId)?.name ?? null)
                    : null
                }
                date={selectedDate}
                dateLabel={formatDateLabel(selectedDate, now.date)}
                defaultName={defaultName}
                defaultPhone={defaultPhone}
                lineConnected={lineConnected}
              />
            ) : (
              <EmptyHint icon="event_busy" message="ไม่มีคิวว่างในวันนี้" />
            )
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
          step={stepBase + 3}
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

      {/* On a full day the actionable CTA is the waitlist join inside
          WaitlistPanel, so the permanently-disabled booking submit is hidden. */}
      {selectedDay?.status === "full" ? null : (
        <div
          className={cn(
            "sticky bottom-0 -mx-4 md:mx-0 px-4 md:px-0 py-4 bg-background/95 backdrop-blur border-t border-outline-variant md:bg-transparent md:border-0 md:backdrop-blur-0 md:py-0",
            // Lift above the mobile customer tab bar (sm:hidden) when present.
            showCustomerNav &&
              "bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0",
          )}
        >
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
      )}
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

function ServiceCard({
  service,
  selected,
  onClick,
}: {
  service: BookingService;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl p-4 text-left transition-all border-2",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
    >
      <span className="min-w-0">
        <span className="block font-display text-headline-sm leading-tight">
          {service.name}
        </span>
        <span
          className={cn(
            "mt-0.5 flex items-center gap-1 text-label-sm",
            selected ? "opacity-90" : "text-on-surface-variant",
          )}
        >
          <Icon name="schedule" size={14} />
          {service.durationMinutes} นาที
        </span>
      </span>
      {service.price != null ? (
        <span
          className={cn(
            "shrink-0 text-body-md font-semibold",
            selected ? "text-on-primary" : "text-primary",
          )}
        >
          {formatBaht(service.price)}
        </span>
      ) : null}
    </button>
  );
}

function StaffCard({
  name,
  subtitle,
  icon,
  selected,
  onClick,
  soonest,
  today,
  fastest = false,
}: {
  name: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
  /** Earliest free opening for this option; null when fully booked. */
  soonest: SoonestSlot | null;
  /** Today's Bangkok date, for the "วันนี้/พรุ่งนี้" relative label. */
  today: string;
  /** True only on "ใครก็ได้" when it genuinely opens up sooner than any one staff. */
  fastest?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl p-4 text-center transition-all border-2",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : fastest
            ? "bg-surface-container-low text-on-surface border-primary/40 hover:bg-surface-container-high"
            : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center size-10 rounded-full",
          selected ? "bg-on-primary/15" : "bg-secondary-container text-on-secondary-container",
        )}
      >
        <Icon name={icon} />
      </span>
      <span className="font-display font-semibold text-label-md leading-tight truncate max-w-full">
        {name}
      </span>
      {subtitle ? (
        <span
          className={cn(
            "text-label-sm truncate max-w-full",
            selected ? "opacity-80" : "text-on-surface-variant",
          )}
        >
          {subtitle}
        </span>
      ) : null}
      <span
        className={cn(
          "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold max-w-full",
          selected
            ? "bg-on-primary/15 text-on-primary"
            : soonest == null
              ? "bg-surface-container-high text-on-surface-variant"
              : fastest
                ? "bg-primary/12 text-primary"
                : "bg-secondary-container/60 text-on-secondary-container",
        )}
      >
        <Icon
          name={soonest == null ? "event_busy" : fastest ? "bolt" : "schedule"}
          size={14}
        />
        <span className="truncate">
          {soonest == null
            ? "ไม่มีคิวว่าง"
            : fastest
              ? `เร็วกว่า · ${formatSoonest(soonest, today)}`
              : formatSoonest(soonest, today)}
        </span>
      </span>
    </button>
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
  // Closed days stay disabled; FULL days are clickable so the customer can open
  // the waitlist for that date (OPP-05) — the time step then shows the panel.
  const disabled = day.status === "closed";
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
              ? "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container-high"
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
      title={slot.isTaken ? "ช่วงเวลานี้ถูกจองแล้ว" : undefined}
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
};

/** Stable identity for a service in local state (the implicit one has no id). */
function serviceKey(s: BookingService): string {
  return s.id ?? "__implicit__";
}

/** Stable key for a (date, slotTime) pair used in the locally-taken set. */
function takenKey(date: string, slotTime: string): string {
  return `${date} ${slotTime}`;
}

function buildDays(
  context: BookingContext,
  windowDays: ReturnType<typeof eachDateInWindow>,
  durationMinutes: number,
  now: ClockNow,
  locallyTaken: ReadonlySet<string>,
  capacity: number,
  staffFilter: ReadonlySet<string> | null,
): BookableDay[] {
  return windowDays.map(({ dateYmd, dayOfWeek }) => {
    const [, m, d] = dateYmd.split("-").map(Number);
    const hours = context.hours[dayOfWeek];
    const isOpen = Boolean(hours?.isOpen && hours.openTime && hours.closeTime);

    let status: DayStatus;
    if (!isOpen) {
      status = "closed";
    } else {
      const avail = evaluateSlots({
        openTime: hours!.openTime!,
        closeTime: hours!.closeTime!,
        durationMinutes,
        date: dateYmd,
        intervals: context.bookedIntervals,
        capacity,
        isToday: dateYmd === now.date,
        nowHHMM: now.timeHHMM,
        staffIdFilter: staffFilter,
      });
      const hasAvailable = avail.some(
        (s) => s.isAvailable && !locallyTaken.has(takenKey(dateYmd, s.time)),
      );
      status = hasAvailable ? "available" : "full";
    }

    return { dateYmd, dayOfWeek, dayOfMonth: d, month0: m - 1, status };
  });
}

/** Sortable key for a soonest-slot — "YYYY-MM-DD HH:MM" sorts chronologically. */
function soonestKey(s: SoonestSlot): string {
  return `${s.date} ${s.time}`;
}

/** "วันนี้ 14:00" / "พรุ่งนี้ 10:00" / "15 มิ.ย. 09:00" — relative to `today`. */
function formatSoonest(s: SoonestSlot, today: string): string {
  const [, m, d] = s.date.split("-").map(Number);
  const label =
    s.date === today
      ? "วันนี้"
      : s.date === nextYmd(today)
        ? "พรุ่งนี้"
        : `${d} ${THAI_MONTH_SHORT[m - 1]}`;
  return `${label} ${s.time}`;
}

/** "วันนี้ 15 มิ.ย." / "พรุ่งนี้ 16 มิ.ย." / "18 มิ.ย." — a date label, no time. */
function formatDateLabel(date: string, today: string): string {
  const [, m, d] = date.split("-").map(Number);
  const dm = `${d} ${THAI_MONTH_SHORT[m - 1]}`;
  if (date === today) return `วันนี้ ${dm}`;
  if (date === nextYmd(today)) return `พรุ่งนี้ ${dm}`;
  return dm;
}

function computeSlotsForDay(
  day: BookableDay,
  context: BookingContext,
  durationMinutes: number,
  now: ClockNow,
  locallyTaken: ReadonlySet<string>,
  capacity: number,
  staffFilter: ReadonlySet<string> | null,
): SlotView[] {
  const hours = context.hours[day.dayOfWeek];
  if (!hours?.isOpen || !hours.openTime || !hours.closeTime) return [];
  const avail = evaluateSlots({
    openTime: hours.openTime,
    closeTime: hours.closeTime,
    durationMinutes,
    date: day.dateYmd,
    intervals: context.bookedIntervals,
    capacity,
    isToday: day.dateYmd === now.date,
    nowHHMM: now.timeHHMM,
    staffIdFilter: staffFilter,
  });
  // Past slots (today only) are hidden, not greyed out — a customer can't book
  // a time that has already gone, so showing it adds noise. Taken-but-future
  // slots stay visible (disabled) so the customer can see the day filling up.
  return avail
    .filter((s) => !s.isPast)
    .map((s) => {
      const locTaken = locallyTaken.has(takenKey(day.dateYmd, s.time));
      return {
        time: s.time,
        isTaken: s.isFull || locTaken,
        isAvailable: s.isAvailable && !locTaken,
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
