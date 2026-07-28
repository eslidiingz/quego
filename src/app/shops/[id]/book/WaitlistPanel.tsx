"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { isValidThaiPhone } from "@/lib/validation/phone";
import { joinWaitlistAction, type JoinWaitlistState } from "./actions";

/**
 * OPP-05 — the "แจ้งเตือนเมื่อมีคิวว่าง" panel shown in the time step when the
 * chosen (service, staff, date) is fully booked. The customer leaves their name
 * + phone and we notify them over LINE the moment a slot frees.
 *
 * NB: deliberately NOT a `<form>` — this renders INSIDE BookingForm's booking
 * form, and nested forms are invalid HTML. It collects its own state and calls
 * the `joinWaitlistAction` server action imperatively inside a transition, so it
 * is fully independent of the surrounding booking submission.
 *
 * SRP: collect + submit the waitlist join, render its inline result. The
 * validation + write live in the service (DIP).
 */
export function WaitlistPanel({
  shopId,
  serviceId,
  serviceName,
  preferredStaffId,
  staffLabel,
  date,
  dateLabel,
  defaultName = "",
  defaultPhone = "",
  lineConnected,
}: {
  shopId: string;
  serviceId: string;
  serviceName: string;
  preferredStaffId: string | null;
  /** Human label for the pinned staff, or null for "ใครก็ได้". */
  staffLabel: string | null;
  date: string; // YYYY-MM-DD
  /** Pretty Thai label for the date (e.g. "พรุ่งนี้ 16 มิ.ย."). */
  dateLabel: string;
  defaultName?: string;
  defaultPhone?: string;
  /** Known only for a signed-in customer: whether their LINE is connected. */
  lineConnected?: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [state, setState] = useState<JoinWaitlistState>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = name.trim().length > 0 && isValidThaiPhone(phone);

  const submit = () => {
    const fd = new FormData();
    fd.set("shopId", shopId);
    fd.set("serviceId", serviceId);
    fd.set("preferredStaffId", preferredStaffId ?? "");
    fd.set("date", date);
    fd.set("customerName", name);
    fd.set("customerPhone", phone);
    startTransition(async () => {
      setState(await joinWaitlistAction(null, fd));
    });
  };

  // Success — joined (or already on the list).
  if (state?.ok) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/8 p-5 space-y-2 text-center">
        <span className="inline-flex items-center justify-center size-12 rounded-full bg-primary/15 text-primary">
          <Icon name="check_circle" size={26} />
        </span>
        <h3 className="font-display text-headline-sm text-on-surface">
          {state.alreadyWaiting ? "คุณอยู่ในรายการรอแล้ว" : "เพิ่มในรายการรอเรียบร้อย"}
        </h3>
        <p className="text-body-md text-on-surface-variant">
          ทันทีที่มีคิวว่างสำหรับ{" "}
          <span className="font-semibold text-on-surface">{serviceName}</span>{" "}
          {dateLabel} รายการของคุณจะขึ้นสถานะ “มีคิวว่าง” ให้กดจองได้เลย
        </p>
        <Link
          href="/me/waitlist"
          className="inline-flex items-center justify-center gap-1.5 text-label-md font-semibold text-primary hover:underline"
        >
          <Icon name="list_alt" size={18} />
          ดูรายการรอของฉัน
        </Link>
      </div>
    );
  }

  // A slot opened between page load and submit — nudge to refresh + book.
  if (state && !state.ok && state.code === "slots_available") {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/8 p-5 space-y-3 text-center">
        <span className="inline-flex items-center justify-center size-12 rounded-full bg-primary/15 text-primary">
          <Icon name="celebration" size={26} />
        </span>
        <h3 className="font-display text-headline-sm text-on-surface">
          มีคิวว่างแล้ว!
        </h3>
        <p className="text-body-md text-on-surface-variant">{state.message}</p>
        <Button
          type="button"
          variant="secondary"
          rounded="full"
          onClick={() => window.location.reload()}
          iconLeft={<Icon name="refresh" />}
        >
          รีเฟรชเพื่อเลือกเวลา
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-outline-variant bg-surface-container-low/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center size-10 rounded-full bg-secondary-container text-on-secondary-container shrink-0">
          <Icon name="hourglass_top" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-headline-sm text-on-surface">
            คิวเต็มแล้ว — ฝากรอคิวว่างไว้ได้
          </h3>
          <p className="text-label-md text-on-surface-variant mt-0.5">
            {serviceName}
            {staffLabel ? ` · ${staffLabel}` : ""} · {dateLabel} — ถ้ามีคนยกเลิก
            เราจะเสนอคิวให้ตามลำดับที่ฝากไว้
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="ชื่อ"
          placeholder="ชื่อจริงหรือชื่อเล่น"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <PhoneInput
          label="เบอร์โทร"
          placeholder="0812345678"
          value={phone}
          onChange={(digits) => setPhone(digits)}
          helperText="เบอร์เดียวกับที่ใช้จองคิว เพื่อดูสถานะรายการรอ"
        />
      </div>

      {lineConnected === false ? (
        <Link
          href="/me/waitlist"
          className="flex items-start gap-2 rounded-xl bg-secondary-container/40 p-3 text-label-md text-on-secondary-container hover:bg-secondary-container/60 transition-colors"
        >
          <Icon name="list_alt" size={18} className="mt-0.5 shrink-0" />
          <span>
            ดูสถานะได้ที่หน้า “รายการรอของฉัน” — อัปเดตทันทีที่มีคิวว่าง
          </span>
        </Link>
      ) : (
        <p className="flex items-start gap-2 text-label-md text-on-surface-variant">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          <span>ใช้เบอร์นี้เช็กสถานะได้ที่หน้า “รายการรอของฉัน”</span>
        </p>
      )}

      {state && !state.ok ? (
        <div className="flex items-start gap-2 rounded-xl bg-error-container/30 border border-error/20 p-3 text-on-error-container text-body-md">
          <Icon name="error" size={18} className="text-error mt-0.5 shrink-0" />
          <p>{state.message}</p>
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        rounded="full"
        fullWidth
        onClick={submit}
        disabled={!canSubmit || pending}
        iconLeft={
          pending ? (
            <Icon name="progress_activity" className="animate-spin" />
          ) : (
            <Icon name="playlist_add" />
          )
        }
      >
        {pending ? "กำลังเพิ่ม..." : "ฝากรอคิวว่าง"}
      </Button>
    </div>
  );
}
