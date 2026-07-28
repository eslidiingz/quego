import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OwnerDashboardMock } from "@/components/landing/OwnerDashboardMock";

/**
 * Quego `/business` hero — the supply-side mirror of the customer LandingHero:
 * same teal gradient + concentric rings, but the copy, CTAs, and right-rail
 * mock all speak to a shop owner. Primary CTA drives to /shops/register
 * (self-serve, no approval wait); secondary lets an existing owner sign in.
 *
 * SRP: hero presentation + conversion intent for shop owners. No data; the
 * OwnerDashboardMock is decorative.
 */
export function BusinessHero() {
  return (
    <header className="relative overflow-hidden bg-quego-hero text-on-primary px-4 md:px-12 pt-12 md:pt-20 pb-16 md:pb-20">
      {/* Decorative concentric rings, bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 size-[480px] rounded-full border border-on-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -bottom-20 size-[300px] rounded-full border border-on-primary/10"
      />

      <div className="relative z-10 mx-auto max-w-[1180px]">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_clamp(340px,34vw,460px)] lg:gap-16">
          {/* ── Left rail: copy + CTAs ─────────────────────────────────── */}
          <div className="max-w-[680px]">
            <span className="inline-flex items-center gap-2 font-display text-label-sm font-medium uppercase tracking-wide text-primary-fixed-dim border border-primary-fixed-dim/40 px-3.5 py-1.5 rounded-full mb-6">
              สำหรับเจ้าของร้าน
            </span>

            <h1 className="font-display text-display-xl-mobile sm:text-display-xl leading-[1.1] mb-5">
              เปิดรับคิวออนไลน์
              <br />
              ให้ร้านของคุณ
            </h1>

            <p className="text-body-lg text-on-primary/85 max-w-[540px] mb-8">
              ให้ลูกค้าจองคิวเองได้ตลอด 24 ชั่วโมง ลดงานรับโทรศัพท์ คิวรายช่างไม่ชนกัน
              จัดการคิวหน้าร้านได้จากที่เดียว เริ่มต้นฟรี สมัครเสร็จใช้งานได้ทันที
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/shops/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary text-on-secondary font-medium text-label-lg px-7 py-3.5 shadow-coral-glow hover:bg-secondary-fixed-variant active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out"
              >
                <Icon name="storefront" size={20} />
                เปิดร้านฟรี
              </Link>
              <Link
                href="/shop/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-on-primary/10 text-on-primary border border-on-primary/25 font-medium text-label-lg px-7 py-3.5 hover:bg-on-primary/20 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out"
              >
                <Icon name="login" size={20} />
                เข้าสู่ระบบร้าน
              </Link>
            </div>

            {/* Trust micro-line under the CTAs */}
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-md text-on-primary/65 mt-5">
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  name="check_circle"
                  size={16}
                  className="text-primary-fixed-dim"
                />
                ฟรี ไม่มีค่าแรกเข้า
              </span>
              <span aria-hidden className="text-on-primary/30">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  name="check_circle"
                  size={16}
                  className="text-primary-fixed-dim"
                />
                ใช้งานทันที ไม่ต้องรออนุมัติ
              </span>
              <span aria-hidden className="text-on-primary/30">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  name="check_circle"
                  size={16}
                  className="text-primary-fixed-dim"
                />
                ไม่ต้องติดตั้งอุปกรณ์
              </span>
            </p>
          </div>

          {/* ── Right rail: owner dashboard mock (desktop only) ────────── */}
          <OwnerDashboardMock className="hidden lg:block" />
        </div>
      </div>
    </header>
  );
}
