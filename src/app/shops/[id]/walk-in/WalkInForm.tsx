"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { BookingService } from "@/lib/booking/slot-math";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { isValidThaiPhone } from "@/lib/validation/phone";
import type { WalkInState } from "./actions";

const CARD =
  "bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4";

/** "ตัดผม · 30 นาที · ฿200" — duration always, price only when set. */
function serviceLabel(svc: BookingService): string {
  const parts = [svc.name, `${svc.durationMinutes} นาที`];
  if (svc.price != null) parts.push(`฿${svc.price.toLocaleString("th-TH")}`);
  return parts.join(" · ");
}

/**
 * In-shop walk-in self-join form (OPP-08). A customer who scanned the shop's
 * QR enters their name + phone and picks a service; submitting hands off to
 * `joinWalkInAction`, which books the soonest opening today and redirects to
 * the live-queue page. No date/time picker — "join now" is computed server-side.
 *
 * SRP: this renders + validates; it owns no booking logic. Phone is required
 * (the walk-in's only confirmation + recovery channel at a shared kiosk).
 */
export function WalkInForm({
  shopId,
  action,
  services,
  defaultServiceId,
}: {
  /** Used only for the book-ahead link; the booking shop is bound into `action`. */
  shopId: string;
  /** `joinWalkInAction` with the trusted shopId already bound on the server. */
  action: (prev: WalkInState, formData: FormData) => Promise<WalkInState>;
  services: BookingService[];
  /** Optional pre-selection from a per-service QR (`?serviceId=`). */
  defaultServiceId?: string;
}) {
  const singleService = services.length === 1 ? services[0] : null;
  const initialServiceId =
    defaultServiceId && services.some((s) => s.id === defaultServiceId)
      ? defaultServiceId
      : (singleService?.id ?? "");

  const [serviceId, setServiceId] = useState<string>(initialServiceId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [state, formAction, pending] = useActionState(action, null);

  const canSubmit =
    serviceId.length > 0 &&
    name.trim().length > 0 &&
    isValidThaiPhone(phone);

  return (
    <form action={formAction} className="space-y-stack-md">
      <section className={CARD}>
        <header className="space-y-1">
          <h2 className="font-display text-headline-sm text-on-surface">
            เข้าคิวด้วยตัวเอง
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            กรอกข้อมูลแล้วระบบจะจัดคิวว่างที่เร็วที่สุดของวันนี้ให้คุณ
          </p>
        </header>

        {singleService ? (
          // Exactly one service: no picker — show it and post the id silently.
          <>
            <input
              type="hidden"
              name="serviceId"
              value={singleService.id ?? ""}
            />
            <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3">
              <Icon name="content_cut" size={20} className="text-primary" />
              <span className="text-body-md text-on-surface">
                {serviceLabel(singleService)}
              </span>
            </div>
          </>
        ) : (
          <Select
            name="serviceId"
            label="บริการ"
            required
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="" disabled>
              เลือกบริการ
            </option>
            {services.map((svc) => (
              <option key={svc.id ?? "default"} value={svc.id ?? ""}>
                {serviceLabel(svc)}
              </option>
            ))}
          </Select>
        )}

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
          helperText="ใช้ยืนยันคิว และให้ร้านติดต่อกลับได้"
        />
      </section>

      {state && !state.ok ? (
        <div className="bg-error-container/30 border border-error/20 text-on-error-container rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Icon name="error" className="text-error mt-0.5" />
            <p className="text-body-md">{state.message}</p>
          </div>
          {state.code === "no_slot_today" ? (
            <Link
              href={`/shops/${shopId}/book`}
              className="inline-flex items-center gap-1.5 text-label-md font-bold text-primary hover:underline"
            >
              <Icon name="event_upcoming" size={18} />
              จองล่วงหน้าสำหรับวันอื่น
            </Link>
          ) : null}
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
              <Icon name="bolt" />
            )
          }
        >
          {pending ? "กำลังเข้าคิว..." : "เข้าคิวเลย"}
        </Button>
        <p className="text-label-sm text-on-surface-variant text-center mt-3">
          หลังเข้าคิว ระบบจะพาไปหน้าติดตามคิวของคุณ
        </p>
      </div>
    </form>
  );
}
