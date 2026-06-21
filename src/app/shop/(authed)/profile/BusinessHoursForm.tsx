"use client";

import { Fragment, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { BusinessHour, DayOfWeek } from "@/lib/services/business-hours";
import { updateBusinessHours, type UpdateHoursState } from "./actions";

// Re-declared here (instead of imported) because the service module is
// `server-only` — importing a value from it would pull the server module
// into the client bundle.
const DAYS_OF_WEEK: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

// Mon → Sun display order (working week first, then weekend).
const DISPLAY_ORDER: { day: DayOfWeek; label: string }[] = [
  { day: 1, label: "จันทร์" },
  { day: 2, label: "อังคาร" },
  { day: 3, label: "พุธ" },
  { day: 4, label: "พฤหัสบดี" },
  { day: 5, label: "ศุกร์" },
  { day: 6, label: "เสาร์" },
  { day: 0, label: "อาทิตย์" },
];

const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "20:00";

type DayHour = { isOpen: boolean; openTime: string; closeTime: string };
type PerDayState = Record<DayOfWeek, DayHour>;

/**
 * Detect whether the saved schedule looks like "open every day with the same
 * hours". When true, the form defaults to the simplified single-pair UI.
 */
function detectEveryDayMode(hours: BusinessHour[]): {
  enabled: boolean;
  openTime: string;
  closeTime: string;
} {
  const allOpen = hours.length === 7 && hours.every((h) => h.isOpen);
  if (!allOpen) {
    return { enabled: false, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE };
  }
  const first = hours[0];
  const allSame = hours.every(
    (h) => h.openTime === first.openTime && h.closeTime === first.closeTime,
  );
  return {
    enabled: allSame,
    openTime: first.openTime ?? DEFAULT_OPEN,
    closeTime: first.closeTime ?? DEFAULT_CLOSE,
  };
}

function buildPerDayFromHours(hours: BusinessHour[]): PerDayState {
  const byDay = new Map<DayOfWeek, BusinessHour>();
  for (const h of hours) byDay.set(h.dayOfWeek, h);
  const out = {} as PerDayState;
  for (const day of DAYS_OF_WEEK) {
    const h = byDay.get(day);
    out[day] = {
      isOpen: h?.isOpen ?? false,
      openTime: h?.openTime ?? DEFAULT_OPEN,
      closeTime: h?.closeTime ?? DEFAULT_CLOSE,
    };
  }
  return out;
}

/**
 * SRP: render the schedule editor and submit to the server action.
 *
 * Two UI modes share one form submission shape:
 * - **Every-day mode**: a single open/close pair, mirrored into 7 hidden
 *   `day_*` inputs so the server sees the same FormData layout.
 * - **Per-day mode**: 7 day rows, each with its own toggle + times.
 *
 * All state derives from the server-loaded `hours` — the DB is the single
 * source of truth (the page is `force-dynamic`, so `hours` is always the
 * freshly-read schedule). Per-day values live in React state and stay intact
 * across mode toggles within a session (the rows are only hidden, not
 * unmounted), so switching back and forth never loses what the owner typed.
 *
 * NOTHING is persisted to browser storage. A refresh before pressing save
 * must render exactly what's in the DB — never a half-edited toggle state the
 * owner never committed (that previously made an unsaved "open every day"
 * flip look like it had been saved).
 *
 * Because every-day mode mirrors all 7 days *open* on submit, saving it would
 * silently reopen any day the owner had set to closed. A confirm modal gates
 * that case, naming the days that would be reopened, so the schedule is never
 * overwritten by accident — the one-tap "open all 7 days" path is preserved.
 *
 * The server action stays single-purpose: parse 7 days and persist. The
 * mode branching is a presentation-layer convenience.
 */
export function BusinessHoursForm({
  hours,
}: {
  hours: BusinessHour[];
  /** Reserved for future per-shop logic; the form is driven entirely by `hours`. */
  shopId?: string;
}) {
  const [state, formAction, pending] = useActionState<UpdateHoursState, FormData>(
    updateBusinessHours,
    null,
  );
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToastOpen(true);
  }, [state]);

  // Every piece of state below is seeded from the server-loaded `hours` (the
  // freshly-read DB schedule). Per-day values live in React state and survive
  // mode toggles within the session because the rows are hidden, not
  // unmounted — so no browser-storage snapshot is needed to preserve them.
  const [perDay, setPerDay] = useState<PerDayState>(() =>
    buildPerDayFromHours(hours),
  );

  const initialEveryDay = detectEveryDayMode(hours);
  const [everyDayMode, setEveryDayMode] = useState(initialEveryDay.enabled);
  const [everyDayOpen, setEveryDayOpen] = useState(initialEveryDay.openTime);
  const [everyDayClose, setEveryDayClose] = useState(initialEveryDay.closeTime);

  // Flip between every-day and per-day mode. Nothing is persisted: an unsaved
  // toggle must not survive a refresh, or the form would show a schedule the
  // owner never actually saved. The per-day rows keep their React state across
  // the toggle, so switching back and forth never loses typed-in times.
  const handleToggleEveryDayMode = () => setEveryDayMode((prev) => !prev);

  // Overwrite guard. "เปิดทุกวัน" mirrors all 7 days open on submit, so saving
  // in every-day mode silently flips any closed day back to open. We list the
  // days that would be reopened and ask before the schedule is overwritten —
  // the owner keeps the one-tap "open all 7 days" path, just never by accident.
  const formRef = useRef<HTMLFormElement>(null);
  const bypassConfirmRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const forcedOpenDays = everyDayMode
    ? DISPLAY_ORDER.filter(({ day }) => !perDay[day].isOpen)
    : [];
  const needsOverwriteConfirm = forcedOpenDays.length > 0;

  // Gate the native form action. The confirm path re-submits with a bypass flag
  // so the second pass runs the server action normally — keeping useActionState's
  // `pending` and progressive submission intact (no imperative dispatch needed).
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (bypassConfirmRef.current) {
      bypassConfirmRef.current = false;
      return;
    }
    if (needsOverwriteConfirm) {
      event.preventDefault();
      setConfirmOpen(true);
    }
  };

  const handleConfirmOverwrite = () => {
    bypassConfirmRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  };

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const submitError =
    state && !state.ok && !state.fieldErrors ? state.message : null;

  const everyDayError = everyDayMode
    ? errors?.[0] ?? errors?.[1] ?? errors?.[2] ?? errors?.[3] ?? errors?.[4] ?? errors?.[5] ?? errors?.[6]
    : undefined;

  return (
    <>
      {toastOpen ? (
        <Toast
          kind="success"
          message="บันทึกเวลาทำการเรียบร้อย"
          onDismiss={() => setToastOpen(false)}
        />
      ) : null}

      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
          {/* Mode toggle — button-based to keep visual purely React-driven. */}
          <div className="p-4 md:p-6 flex items-center justify-between gap-4 border-b border-outline-variant/30">
            <div>
              <p className="font-medium text-body-md text-on-surface">
                เปิดทุกวัน
              </p>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                ใช้ช่วงเวลาเดียวกันสำหรับวันจันทร์–อาทิตย์
              </p>
            </div>
            <ToggleButton
              checked={everyDayMode}
              onClick={handleToggleEveryDayMode}
              disabled={pending}
              ariaLabel="สลับโหมดเปิดทุกวัน"
            />
          </div>

          {everyDayMode ? (
            <EveryDayPanel
              openTime={everyDayOpen}
              closeTime={everyDayClose}
              onChangeOpen={setEveryDayOpen}
              onChangeClose={setEveryDayClose}
              error={everyDayError}
              disabled={pending}
            />
          ) : (
            <div className="divide-y divide-outline-variant/30">
              {DISPLAY_ORDER.map(({ day, label }) => (
                <DayRow
                  key={day}
                  day={day}
                  label={label}
                  value={perDay[day]}
                  error={errors?.[day]}
                  disabled={pending}
                  onChange={(next) =>
                    setPerDay((prev) => ({ ...prev, [day]: next }))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Hidden inputs that produce the 7-day FormData shape the server
            action expects. In every-day mode we mirror the single pair to
            all 7 days. */}
        {everyDayMode
          ? DAYS_OF_WEEK.map((day) => (
              <Fragment key={`mirror-${day}`}>
                <input type="hidden" name={`day_${day}_open`} value="on" />
                <input
                  type="hidden"
                  name={`day_${day}_open_time`}
                  value={everyDayOpen}
                />
                <input
                  type="hidden"
                  name={`day_${day}_close_time`}
                  value={everyDayClose}
                />
              </Fragment>
            ))
          : null}

        {submitError ? (
          <div
            role="alert"
            className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="xl"
            rounded="full"
            disabled={pending}
            iconLeft={
              pending ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="save" />
              )
            }
          >
            {pending ? "กำลังบันทึก..." : "บันทึกเวลาทำการ"}
          </Button>
        </div>
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="ยืนยันการเปิดทุกวัน"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleConfirmOverwrite}>
              เปิดทุกวันและบันทึก
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-body-md text-on-surface-variant">
          <p>
            คุณตั้ง{" "}
            <span className="font-medium text-on-surface">
              {forcedOpenDays.map((d) => `วัน${d.label}`).join(" · ")}
            </span>{" "}
            ไว้เป็นวันหยุด การบันทึกแบบ “เปิดทุกวัน”
            จะเปลี่ยนให้วันเหล่านี้กลับมาเปิดด้วยเวลา{" "}
            <span className="font-medium text-on-surface">
              {everyDayOpen}–{everyDayClose}
            </span>
          </p>
          <p>
            หากต้องการคงวันหยุดไว้ ให้ปิดสวิตช์ “เปิดทุกวัน”
            แล้วปรับเวลาทีละวันแทน
          </p>
        </div>
      </Modal>
    </>
  );
}

/**
 * Pure-button switch: visual is driven entirely by React state, not a DOM
 * checkbox. SRP: render the toggle pill, dispatch onClick.
 */
function ToggleButton({
  checked,
  onClick,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-outline-variant",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-transform",
          checked ? "bg-on-primary translate-x-5" : "bg-surface dark:bg-on-surface",
        )}
      />
    </button>
  );
}

/**
 * Single-pair time panel used in every-day mode.
 */
function EveryDayPanel({
  openTime,
  closeTime,
  onChangeOpen,
  onChangeClose,
  error,
  disabled,
}: {
  openTime: string;
  closeTime: string;
  onChangeOpen: (next: string) => void;
  onChangeClose: (next: string) => void;
  error?: { open?: string; close?: string; range?: string };
  disabled: boolean;
}) {
  return (
    <div className="p-4 md:p-6 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <TimeBlock
          label="เปิด"
          value={openTime}
          onChange={onChangeOpen}
          hasError={Boolean(error?.open || error?.range)}
          disabled={disabled}
        />
        <span className="text-on-surface-variant text-body-md">—</span>
        <TimeBlock
          label="ปิด"
          value={closeTime}
          onChange={onChangeClose}
          hasError={Boolean(error?.close || error?.range)}
          disabled={disabled}
        />
      </div>
      {error?.open || error?.close || error?.range ? (
        <p className="text-label-sm text-error">
          {error.range ?? error.open ?? error.close}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One row in the per-day grid. Fully controlled by parent state; submits
 * via hidden inputs (when isOpen) so the server action sees the same
 * FormData layout as every-day mode.
 */
function DayRow({
  day,
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  day: DayOfWeek;
  label: string;
  value: DayHour;
  error?: { open?: string; close?: string; range?: string };
  disabled: boolean;
  onChange: (next: DayHour) => void;
}) {
  const { isOpen, openTime, closeTime } = value;
  return (
    <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center justify-between md:w-48 shrink-0">
        <span
          className={cn(
            "font-medium text-body-md",
            isOpen ? "text-on-surface" : "text-on-surface-variant",
          )}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-label-sm",
              isOpen ? "text-on-surface" : "text-on-surface-variant",
            )}
          >
            {isOpen ? "เปิด" : "ปิด"}
          </span>
          <ToggleButton
            checked={isOpen}
            onClick={() => onChange({ ...value, isOpen: !isOpen })}
            disabled={disabled}
            ariaLabel={`สลับสถานะวัน${label}`}
          />
        </div>
      </div>

      {/* FormData: submit the open flag only when the day is open. */}
      {isOpen ? (
        <input type="hidden" name={`day_${day}_open`} value="on" />
      ) : null}

      {isOpen ? (
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <TimeBlock
              name={`day_${day}_open_time`}
              label="เปิด"
              value={openTime}
              onChange={(next) => onChange({ ...value, openTime: next })}
              hasError={Boolean(error?.open || error?.range)}
              disabled={disabled}
            />
            <span className="text-on-surface-variant text-body-md">—</span>
            <TimeBlock
              name={`day_${day}_close_time`}
              label="ปิด"
              value={closeTime}
              onChange={(next) => onChange({ ...value, closeTime: next })}
              hasError={Boolean(error?.close || error?.range)}
              disabled={disabled}
            />
          </div>
          {error?.open || error?.close || error?.range ? (
            <p className="text-label-sm text-error">
              {error.range ?? error.open ?? error.close}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="flex-1 text-body-md text-on-surface-variant md:pl-2">
          ปิดให้บริการ
        </p>
      )}
    </div>
  );
}

/**
 * Controlled native time input. `name` is set in per-day mode so the form
 * submits it directly; in every-day mode the value is mirrored to hidden
 * inputs at the form level and `name` is omitted here.
 */
function TimeBlock({
  name,
  label,
  value,
  onChange,
  hasError,
  disabled,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  hasError: boolean;
  disabled: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      <input
        type="time"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        // 600s = 10-minute step. Honored by keyboard arrows / spinners; the
        // dropdown picker on some browsers still shows every minute. The
        // server validates minute % 10 === 0 as a fallback.
        step={600}
        className={cn(
          "h-11 px-3 rounded-lg bg-surface-container-high text-on-surface text-body-md transition-all duration-200 ease-out",
          "border-2 border-transparent hover:bg-surface-container-highest focus:bg-surface-container-highest focus:border-secondary focus:outline-none",
          hasError && "border-error focus:border-error",
        )}
      />
    </label>
  );
}
