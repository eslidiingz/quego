"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { isValidThaiPhone } from "@/lib/validation/phone";
import {
  evaluateSlots,
  type BookingContext,
  type BookingService,
  type StaffOption,
} from "@/lib/booking/slot-math";
import {
  createManualBookingAction,
  type CreateManualBookingState,
} from "./actions";

/**
 * Shop-side "add a booking on behalf of a customer" dialog. Same picker UX
 * as the customer-facing form, but wrapped in a modal and submitting to
 * `createManualBookingAction` (which uses the shop session, NOT a posted
 * shopId, for authority).
 *
 * SRP: owns the picker state + modal lifecycle. Slot validity rules are
 * defined once in `lib/booking/slot-math` and re-validated server-side.
 */
export function NewBookingDialog({
  context,
  triggerClassName,
  triggerSize = "md",
}: {
  context: BookingContext;
  triggerClassName?: string;
  triggerSize?: "sm" | "md" | "lg" | "xl";
}) {
  const services = context.services;
  const showServiceStep =
    services.length > 1 || (services.length === 1 && services[0].id !== null);
  const autoService = showServiceStep ? null : (services[0] ?? null);
  const autoKey = autoService ? serviceKey(autoService) : null;

  const [open, setOpen] = useState(false);
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(
    autoKey,
  );
  // Shop's chosen staff for this booking; null = "ใครก็ได้" (any free staff).
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [state, formAction, pending] = useActionState<
    CreateManualBookingState,
    FormData
  >(createManualBookingAction, null);

  // Reset + close on success. Wrapped state means the picker is empty next
  // time the dialog opens — fresh sheet for the next walk-in.
  useEffect(() => {
    if (!state?.ok) return;
    // Resetting the picker after an async submit success is exactly what this
    // effect is for — it settles once after a server round-trip, not in a
    // render loop, so the cascade the rule guards against doesn't apply.
    /* eslint-disable react-hooks/set-state-in-effect */
    setOpen(false);
    setSelectedServiceKey(autoKey);
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setName("");
    setPhone("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state, autoKey]);

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

  // Slot-availability inputs depend on the staff choice (mirrors the customer
  // form): single-queue → context.capacity, no filter; "ใครก็ได้" → capacity =
  // #capable staff, filter = them; specific staff → capacity 1, filter = them.
  const { effectiveCapacity, staffFilter } = useMemo(() => {
    if (serviceStaffIds === null) {
      return {
        effectiveCapacity: context.capacity,
        staffFilter: null as ReadonlySet<string> | null,
      };
    }
    if (selectedStaffId) {
      return {
        effectiveCapacity: 1,
        staffFilter: new Set([selectedStaffId]) as ReadonlySet<string>,
      };
    }
    return {
      effectiveCapacity: Math.max(capableStaff.length, 1),
      staffFilter: new Set(capableStaff.map((s) => s.id)) as ReadonlySet<string>,
    };
  }, [serviceStaffIds, selectedStaffId, capableStaff, context.capacity]);

  const days = useMemo(
    () =>
      duration == null
        ? []
        : buildDays(context, duration, effectiveCapacity, staffFilter),
    [context, duration, effectiveCapacity, staffFilter],
  );
  const selectedDay = days.find((d) => d.dateYmd === selectedDate) ?? null;

  const slots = useMemo(() => {
    if (duration == null || !selectedDay || selectedDay.status === "closed")
      return [];
    return computeSlotsForDay(
      selectedDay,
      context,
      duration,
      effectiveCapacity,
      staffFilter,
    );
  }, [selectedDay, context, duration, effectiveCapacity, staffFilter]);

  // Phone is optional on the shop-side manual flow — but if any digits were
  // typed, they must form a valid phone (exactly 10 digits, leading 0) so we
  // don't silently store a half-typed number.
  const phoneValid = phone.length === 0 || isValidThaiPhone(phone);
  const canSubmit =
    Boolean(selectedService) &&
    Boolean(selectedDate) &&
    Boolean(selectedSlot) &&
    name.trim().length > 0 &&
    phoneValid;

  const handleSelectService = (svc: BookingService) => {
    setSelectedServiceKey(serviceKey(svc));
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleSelectStaff = (staffId: string | null) => {
    setSelectedStaffId(staffId);
    // Staff choice changes which slots are free — reset downstream picks.
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleSelectDate = (dateYmd: string) => {
    setSelectedDate(dateYmd);
    setSelectedSlot(null);
  };

  // Step numbers shift as optional steps (service, staff) appear before the
  // date → time → info core.
  const staffStepNum = showServiceStep ? 2 : 1;
  const stepBase =
    (showServiceStep ? 1 : 0) + (showStaffStep ? 1 : 0);

  // A shop with no active services can't take bookings. Point the owner to the
  // service catalogue instead of opening an unusable picker.
  if (services.length === 0) {
    return (
      <Link
        href="/shop/services"
        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-secondary-container text-on-secondary-container text-label-md font-medium hover:opacity-90 transition-opacity"
      >
        <Icon name="add" size={18} />
        เพิ่มบริการเพื่อรับจอง
      </Link>
    );
  }

  return (
    <>
      <Button
        type="button"
        size={triggerSize}
        rounded="full"
        onClick={() => setOpen(true)}
        iconLeft={<Icon name="person_add" />}
        className={triggerClassName}
      >
        เพิ่มการจอง
      </Button>

      <Modal
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title="เพิ่มการจองด้วยตนเอง"
        size="lg"
      >
        <p className="text-body-md text-on-surface-variant mb-5">
          สำหรับลูกค้าที่ติดต่อจองโดยตรงผ่านโทรศัพท์หรือหน้าร้าน
        </p>

        <form action={formAction} className="space-y-stack-md">
          <input
            type="hidden"
            name="serviceId"
            value={selectedService?.id ?? ""}
          />
          <input
            type="hidden"
            name="preferredStaffId"
            value={showStaffStep ? (selectedStaffId ?? "") : ""}
          />
          <input type="hidden" name="date" value={selectedDate ?? ""} />
          <input type="hidden" name="slotTime" value={selectedSlot ?? ""} />

          {showServiceStep ? (
            <Section step={1} title="เลือกบริการ">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <Section step={staffStepNum} title="เลือกผู้ให้บริการ">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StaffCard
                  name="ใครก็ได้"
                  subtitle="จัดช่างที่ว่างให้"
                  icon="groups"
                  selected={selectedStaffId === null}
                  onClick={() => handleSelectStaff(null)}
                />
                {capableStaff.map((member) => (
                  <StaffCard
                    key={member.id}
                    name={member.name}
                    subtitle={member.role ?? undefined}
                    icon="person"
                    selected={selectedStaffId === member.id}
                    onClick={() => handleSelectStaff(member.id)}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          <Section step={stepBase + 1} title="เลือกวัน">
            {!selectedService ? (
              <EmptyHint icon="design_services" message="เลือกบริการก่อน" />
            ) : (
              <div className="grid grid-cols-4 gap-2">
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

          <Section
            step={stepBase + 2}
            title="เลือกเวลา"
            hint={
              selectedService && selectedDay?.status === "available"
                ? `บริการครั้งละ ${selectedService.durationMinutes} นาที`
                : undefined
            }
          >
            {!selectedDate ? (
              <EmptyHint icon="event" message="ยังไม่ได้เลือกวัน" />
            ) : selectedDay?.status === "closed" ? (
              <EmptyHint icon="event_busy" message="ร้านปิดในวันนี้" />
            ) : slots.length === 0 ? (
              <EmptyHint icon="schedule" message="ไม่มีรอบให้บริการในวันนี้" />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
          </Section>

          <Section step={stepBase + 3} title="ข้อมูลลูกค้า">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="customerName"
                label="ชื่อ"
                placeholder="ชื่อจริงหรือชื่อเล่น"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
              <PhoneInput
                name="customerPhone"
                label="เบอร์โทร"
                placeholder="0812345678 (ไม่บังคับ)"
                value={phone}
                onChange={(digits) => setPhone(digits)}
                helperText="ไม่บังคับกรอก"
              />
            </div>
          </Section>

          {state && !state.ok ? (
            <div className="bg-error-container/30 border border-error/20 text-on-error-container rounded-xl p-4 flex items-start gap-3">
              <Icon name="error" className="text-error mt-0.5" />
              <p className="text-body-md">{state.message}</p>
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              fullWidth
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || pending}
              fullWidth
              className="flex-1"
              iconLeft={
                pending ? (
                  <Icon name="progress_activity" className="animate-spin" />
                ) : (
                  <Icon name="event_available" />
                )
              }
            >
              {pending ? "กำลังบันทึก..." : "บันทึกการจอง"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ----- Subcomponents ------------------------------------------------------

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-sm shrink-0">
          {step}
        </span>
        <h3 className="font-display text-headline-sm text-on-surface">
          {title}
        </h3>
        {hint ? (
          <span className="text-label-sm text-on-surface-variant ml-auto">
            {hint}
          </span>
        ) : null}
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
  const price = formatPrice(service.price);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl p-3 text-left transition-all border-2",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
    >
      <span className="font-semibold text-body-md leading-tight">
        {service.name}
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-label-sm",
          selected ? "opacity-90" : "text-on-surface-variant",
        )}
      >
        <Icon name="schedule" size={14} />
        {service.durationMinutes} นาที
        {price ? (
          <>
            <span aria-hidden>·</span>
            <span className="font-semibold">{price}</span>
          </>
        ) : null}
      </span>
    </button>
  );
}

function StaffCard({
  name,
  subtitle,
  icon,
  selected,
  onClick,
}: {
  name: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all border-2",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
          : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container-high",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center size-9 rounded-full",
          selected
            ? "bg-on-primary/15"
            : "bg-secondary-container text-on-secondary-container",
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="font-semibold text-label-md leading-tight truncate max-w-full">
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
  const disabled = day.status !== "available";
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 text-center transition-all border-2",
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
          {STATUS_LABEL[day.status]}
        </span>
      ) : null}
    </button>
  );
}

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
        "rounded-full px-3 py-2 text-label-md font-semibold border-2 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "bg-primary text-on-primary border-primary shadow-tinted"
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
      <Icon name={icon} size={28} className="opacity-60" />
      <p className="text-label-md">{message}</p>
    </div>
  );
}

// ----- Pure helpers (duplicated from BookingForm to avoid a 3-way coupling
// between this client module, the customer page's client module, and the
// pure slot-math library — keeps each surface independently editable) ----

type DayStatus = "closed" | "full" | "available";

type BookableDay = {
  dateYmd: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dayOfMonth: number;
  month0: number;
  status: DayStatus;
};

type SlotView = {
  time: string;
  isAvailable: boolean;
  isTaken: boolean;
  isPast: boolean;
};

function serviceKey(s: BookingService): string {
  return s.id ?? "__implicit__";
}

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return `${price.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
}

function buildDays(
  context: BookingContext,
  durationMinutes: number,
  capacity: number,
  staffFilter: ReadonlySet<string> | null,
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
      const avail = evaluateSlots({
        openTime: hours!.openTime!,
        closeTime: hours!.closeTime!,
        durationMinutes,
        date: cursor,
        intervals: context.bookedIntervals,
        capacity,
        isToday: cursor === context.nowDate,
        nowHHMM: context.nowTimeHHMM,
        staffIdFilter: staffFilter,
      });
      status = avail.some((s) => s.isAvailable) ? "available" : "full";
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
  durationMinutes: number,
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
    isToday: day.dateYmd === context.nowDate,
    nowHHMM: context.nowTimeHHMM,
    staffIdFilter: staffFilter,
  });
  return avail
    // Hide times that have already passed today — the shop can only add a
    // walk-in for now or later, never into the past.
    .filter((s) => !s.isPast)
    .map((s) => ({
      time: s.time,
      isTaken: s.isFull,
      isPast: s.isPast,
      isAvailable: s.isAvailable,
    }));
}

const STATUS_LABEL: Record<DayStatus, string> = {
  closed: "ปิด",
  full: "เต็ม",
  available: "ว่าง",
};

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
