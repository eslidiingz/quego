"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import {
  updateServiceDuration,
  type UpdateServiceDurationState,
} from "./actions";

// Preset durations. Covers the common spectrum: quick services (5–20 min),
// standard slots (30–60 min), and longer treatments (90–180 min).
const PRESETS: { value: number; label: string }[] = [
  { value: 5, label: "5 นาที" },
  { value: 10, label: "10 นาที" },
  { value: 15, label: "15 นาที" },
  { value: 20, label: "20 นาที" },
  { value: 30, label: "30 นาที" },
  { value: 45, label: "45 นาที" },
  { value: 60, label: "1 ชั่วโมง" },
  { value: 90, label: "1 ชั่วโมง 30 นาที" },
  { value: 120, label: "2 ชั่วโมง" },
  { value: 150, label: "2 ชั่วโมง 30 นาที" },
  { value: 180, label: "3 ชั่วโมง" },
];

/**
 * Stand-alone section for the shop's service-per-appointment duration.
 * SRP: collect + submit the duration only — profile fields and business
 * hours live in their own forms on the same page.
 */
export function ServiceDurationForm({
  defaultMinutes,
}: {
  defaultMinutes: number;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateServiceDurationState,
    FormData
  >(updateServiceDuration, null);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToastOpen(true);
  }, [state]);

  // Snap the persisted value to a preset (defensive: should always match,
  // but if a future migration / admin import introduces an off-grid value,
  // we still show the closest preset rather than an empty select).
  const initialValue = snapToPreset(defaultMinutes);

  const submitError = state && !state.ok ? state.message : null;

  return (
    <>
      {toastOpen ? (
        <Toast
          kind="success"
          message="บันทึกระยะเวลาให้บริการเรียบร้อย"
          onDismiss={() => setToastOpen(false)}
        />
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-4 md:p-6">
          <Select
            name="durationMinutes"
            label="ระยะเวลาให้บริการ 1 ครั้ง"
            required
            defaultValue={String(initialValue)}
            disabled={pending}
            helperText="ใช้สำหรับคำนวณเวลารอของลูกค้าในระบบจองคิว"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

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
            {pending ? "กำลังบันทึก..." : "บันทึกระยะเวลา"}
          </Button>
        </div>
      </form>
    </>
  );
}

function snapToPreset(minutes: number): number {
  if (PRESETS.some((p) => p.value === minutes)) return minutes;
  // Find nearest preset by absolute distance.
  let best = PRESETS[0];
  let bestDist = Math.abs(best.value - minutes);
  for (const p of PRESETS) {
    const d = Math.abs(p.value - minutes);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best.value;
}
