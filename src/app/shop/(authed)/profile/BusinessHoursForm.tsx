"use client";

import { Fragment, useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { BusinessHour, DayOfWeek } from "@/lib/services/business-hours";
import { updateBusinessHours, type UpdateHoursState } from "./actions";

// Re-declared here (instead of imported) because the service module is
// `server-only` — importing a value from it would pull the server module
// into the client bundle.
const DAYS_OF_WEEK: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

const EVERY_DAY_STORAGE_KEY = "lq.shop.everyDayMode";

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
 * The per-day state is preserved across every-day toggles via a localStorage
 * snapshot keyed by shopId. So if the owner saves a uniform every-day
 * schedule that overwrites the DB, toggling back to per-day mode restores
 * the previous per-day setup rather than mirroring the every-day times.
 *
 * The server action stays single-purpose: parse 7 days and persist. The
 * mode branching is a presentation-layer convenience.
 */
export function BusinessHoursForm({
  hours,
  shopId,
}: {
  hours: BusinessHour[];
  shopId: string;
}) {
  const PER_DAY_SNAPSHOT_KEY = `lq.shop.${shopId}.perDaySnapshot`;

  const [state, formAction, pending] = useActionState<UpdateHoursState, FormData>(
    updateBusinessHours,
    null,
  );
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToastOpen(true);
  }, [state]);

  // Per-day state initialised from the server snapshot. The mount effect
  // below may override this with a localStorage snapshot if the user is
  // currently in every-day mode (so toggling off restores their original
  // per-day setup, not the uniform every-day data the server has).
  const [perDay, setPerDay] = useState<PerDayState>(() =>
    buildPerDayFromHours(hours),
  );

  const initialEveryDay = detectEveryDayMode(hours);
  const [everyDayMode, setEveryDayMode] = useState(initialEveryDay.enabled);
  const [everyDayOpen, setEveryDayOpen] = useState(initialEveryDay.openTime);
  const [everyDayClose, setEveryDayClose] = useState(initialEveryDay.closeTime);

  // After hydration, restore the user's persisted toggle + per-day snapshot.
  // This runs once on mount so the initial SSR/CSR render matches (no
  // hydration mismatch); the override flips into place imperceptibly fast.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const modeStored = window.sessionStorage.getItem(EVERY_DAY_STORAGE_KEY);
    const everyDayActive = modeStored === "true";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (modeStored !== null) setEveryDayMode(everyDayActive);

    // Only consult the per-day snapshot when every-day mode is active —
    // otherwise the server's per-day data is authoritative (it's what the
    // user just saved in per-day mode).
    if (everyDayActive) {
      const snapshotStored = window.localStorage.getItem(PER_DAY_SNAPSHOT_KEY);
      if (!snapshotStored) return;
      try {
        const snapshot = JSON.parse(snapshotStored) as Partial<PerDayState>;
        if (snapshot && typeof snapshot === "object") {
          setPerDay((prev) => ({ ...prev, ...snapshot }));
        }
      } catch {
        /* corrupt snapshot — fall back to current state */
      }
    }
    // PER_DAY_SNAPSHOT_KEY depends on shopId which is stable for the
    // component lifetime; keep the effect a one-shot mount restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the toggle into sessionStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(EVERY_DAY_STORAGE_KEY, String(everyDayMode));
  }, [everyDayMode]);

  /**
   * Toggle handler: when entering every-day, snapshot current per-day to
   * localStorage; when leaving, restore the snapshot if one exists. This
   * is what makes per-day data survive a "save while in every-day mode"
   * that uniformly overwrites the DB.
   */
  const handleToggleEveryDayMode = () => {
    const next = !everyDayMode;
    if (typeof window !== "undefined") {
      if (next) {
        window.localStorage.setItem(
          PER_DAY_SNAPSHOT_KEY,
          JSON.stringify(perDay),
        );
      } else {
        const stored = window.localStorage.getItem(PER_DAY_SNAPSHOT_KEY);
        if (stored) {
          try {
            const snapshot = JSON.parse(stored) as Partial<PerDayState>;
            if (snapshot && typeof snapshot === "object") {
              setPerDay((prev) => ({ ...prev, ...snapshot }));
            }
          } catch {
            /* corrupt snapshot — keep current state */
          }
        }
      }
    }
    setEveryDayMode(next);
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

      <form action={formAction} className="space-y-4" noValidate>
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
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5",
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
          "h-11 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md transition-all",
          "border-2 border-transparent focus:bg-surface-container-lowest focus:border-secondary focus:outline-none",
          hasError && "border-error focus:border-error",
        )}
      />
    </label>
  );
}
