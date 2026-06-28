"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  LocationCombobox,
  type LocationValue,
} from "@/components/ui/LocationCombobox";

type HeroStat = { num: string; label: string };

export type HeroCategory = { id: string; name: string; icon: string | null };

/**
 * Quego landing hero — teal gradient, headline, and a search affordance that
 * seeds the real shop-discovery filter below (via `?q=` + `#shops` anchor) so
 * the box is never a dead end. Category pills are marketing chips that jump to
 * the same discovery section. On desktop a mock "live-queue" card fills the
 * right rail to demonstrate the core value (real-time queue) without leaving
 * the fold visually empty.
 *
 * SRP: hero presentation + "jump to discovery" intent only. It owns no shop
 * data — counts arrive as props (DIP); the actual filtering lives in
 * ShopDiscovery.
 */
export function LandingHero({
  shopCount,
  categoryCount,
  categories = [],
  initialProvince = "",
  initialDistrict = "",
  initialSubdistrict = "",
}: {
  shopCount: number;
  categoryCount: number;
  /** Real bookable categories for the quick-jump pills (navigate to ?cat=). */
  categories?: HeroCategory[];
  /** Seed the location field from the URL so a reload keeps the chosen area. */
  initialProvince?: string;
  initialDistrict?: string;
  initialSubdistrict?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(
    initialProvince
      ? {
          province: initialProvince,
          district: initialDistrict || null,
          subdistrict: initialSubdistrict || null,
        }
      : null,
  );

  // Stat row doubles as social proof. Lead with the real shop/category counts
  // only once supply is genuinely proof-worthy; below that threshold a bare "2
  // ร้าน" reads thin and cold-starts as "ร้าง", so we fall back to qualitative
  // value stats that hold true from day one (live queue + book anytime).
  const PROOFWORTHY_SHOP_COUNT = 5;
  const stats: HeroStat[] =
    shopCount >= PROOFWORTHY_SHOP_COUNT
      ? [
          { num: `${shopCount}`, label: "ร้านพร้อมให้จอง" },
          { num: `${categoryCount}`, label: "หมวดบริการ" },
        ]
      : [
          { num: "สด", label: "ดูคิวก่อนไป ไม่เสี่ยงรอเก้อ" },
          { num: "24 ชม.", label: "จองล่วงหน้าได้ทุกเวลา" },
        ];

  // Glide to the results instead of letting the hash hard-jump: suppress Next's
  // instant scroll-on-navigation (`scroll: false`) and smooth-scroll the
  // always-mounted #shops section ourselves. Honours prefers-reduced-motion via
  // the global `scroll-behavior` rule (which is gated on no-preference).
  function scrollToShops() {
    document
      .getElementById("shops")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) {
      params.set("province", location.province);
      if (location.district) params.set("district", location.district);
      if (location.subdistrict) params.set("subdistrict", location.subdistrict);
    }
    const q = query.trim();
    if (q) params.set("q", q);
    const qs = params.toString();
    // Update the filter (suppressing Next's instant hash-jump), then glide to
    // the now-stable #shops section. Scrolling AFTER push avoids the re-render
    // cancelling an already-started smooth scroll.
    router.push(qs ? `/?${qs}#shops` : "/#shops", { scroll: false });
    requestAnimationFrame(scrollToShops);
  }

  function goToCategory(categoryId: string) {
    const params = new URLSearchParams();
    if (location) {
      params.set("province", location.province);
      if (location.district) params.set("district", location.district);
      if (location.subdistrict) params.set("subdistrict", location.subdistrict);
    }
    params.set("cat", categoryId);
    router.push(`/?${params.toString()}#shops`, { scroll: false });
    requestAnimationFrame(scrollToShops);
  }

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
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_clamp(340px,34vw,420px)] lg:gap-16">
          {/* ── Left rail: copy + search ───────────────────────────────── */}
          <div className="max-w-[680px]">
            <span className="quego-reveal inline-flex items-center gap-2 font-display text-label-sm font-medium uppercase tracking-wide text-primary-fixed-dim border border-primary-fixed-dim/40 px-3.5 py-1.5 rounded-full mb-6">
              จองคิวร้านบริการ ทั่วไทย
            </span>

            <h1 className="quego-reveal font-display text-display-xl-mobile sm:text-display-xl leading-[1.1] mb-5">
              ตัดผม ร้านนวด คลินิก คาร์แคร์ ร้านอาหาร
              <br />
              จองคิวไว้{" "}
              <em className="not-italic text-tertiary-fixed-dim">
                ไม่ต้องไปนั่งรอเก้อ
              </em>
            </h1>

            <p className="quego-reveal text-body-lg text-on-primary/85 max-w-[540px] mb-8">
              ดูคิวของร้านแบบเรียลไทม์ กดจองล่วงหน้า แล้วรอรับแจ้งเตือน
              ตอนใกล้ถึงคิวของคุณ
            </p>

            {/* Search — location + service, seeds the real discovery filter below */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="quego-reveal flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-surface rounded-2xl sm:rounded-full p-2 sm:pl-5 max-w-[680px] shadow-luxury"
            >
              {/* Location (จังหวัด / เขต-อำเภอ) */}
              <div className="flex-1 sm:basis-[42%] sm:min-w-0 px-1">
                <LocationCombobox
                  variant="bare"
                  value={location}
                  onChange={setLocation}
                  placeholder="ตำบล เขต/อำเภอ หรือจังหวัด"
                  ariaLabel="เลือกพื้นที่ที่ต้องการค้นหา"
                />
              </div>

              {/* Divider: horizontal on mobile, vertical on desktop */}
              <div className="h-px bg-outline-variant/70 mx-2 sm:hidden" />
              <div className="hidden sm:block w-px self-stretch bg-outline-variant/70 my-2" />

              {/* Service / shop free-text */}
              <div className="flex items-center gap-2.5 flex-1 sm:min-w-0 text-on-surface px-2 sm:px-1">
                <Icon name="search" size={20} className="text-primary shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ร้าน หรือบริการที่ต้องการ"
                  aria-label="ค้นหาร้านหรือบริการ"
                  className="w-full bg-transparent border-none outline-none text-body-md text-on-surface placeholder:text-on-surface-variant py-2.5 sm:py-3"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 shrink-0 rounded-full bg-secondary text-on-secondary font-medium text-label-lg px-7 py-3 shadow-coral-glow hover:bg-secondary-fixed-variant active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out"
              >
                <Icon name="search" size={18} />
                ค้นหา
              </button>
            </form>

            {/* Trust micro-line under the search */}
            <p className="quego-reveal flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-md text-on-primary/65 mt-4">
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  name="check_circle"
                  size={16}
                  className="text-primary-fixed-dim"
                />
                ฟรีสำหรับลูกค้า
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
                ไม่ต้องโหลดแอป
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
                แจ้งเตือนอัตโนมัติ
              </span>
            </p>

            {/* Category quick-jumps — real bookable categories that filter below */}
            {categories.length > 0 ? (
              <div className="quego-reveal flex flex-wrap gap-2.5 mt-7">
                {categories.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goToCategory(c.id)}
                    className="inline-flex items-center gap-2 text-label-lg font-medium px-4 py-2 rounded-full border bg-on-primary/10 text-on-primary border-on-primary/20 hover:bg-on-primary/20 transition-[background-color,transform] duration-150 ease-out active:scale-[0.97]"
                  >
                    <Icon name={c.icon ?? "category"} size={18} />
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Stats */}
            {stats.length > 0 ? (
              <dl className="quego-reveal flex flex-wrap gap-x-10 gap-y-4 mt-10">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <span className="block font-display font-bold text-[32px] leading-none tracking-tight">
                        {s.num}
                      </span>
                      <span className="block text-label-md text-on-primary/70 mt-1.5">
                        {s.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          {/* ── Right rail: live-queue mock (desktop only) ─────────────── */}
          <LiveQueueMock />
        </div>
      </div>
    </header>
  );
}

/**
 * Non-interactive marketing mock of the customer "live queue" surface. Renders
 * the real product's hero moment — "อีก N คิวก่อนถึงคุณ" — as a white card so
 * it reads as genuine in-app UI lifted onto the teal hero. Hidden below `lg`
 * (414px stays a clean single column). Decorative only: `aria-hidden`.
 */
function LiveQueueMock() {
  return (
    <div
      aria-hidden
      className="quego-reveal relative hidden lg:block justify-self-end w-full max-w-[420px]"
    >
      {/* Soft gold prestige whisper behind the card */}
      <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-tertiary-fixed-dim/15 blur-2xl" />

      <div className="relative rounded-xl bg-surface text-on-surface p-6 shadow-luxury">
        {/* Live status header */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-label-md font-medium text-success">
            <span className="relative flex size-2.5">
              <span className="animate-queue-pulse absolute inline-flex size-full rounded-full bg-success/40" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            อัปเดตสด
          </span>
          <span className="text-label-sm text-on-surface-variant">
            คิวของคุณ
          </span>
        </div>

        {/* The hero number — Sora */}
        <div className="mt-5 text-center">
          <span className="block font-display font-bold text-[64px] leading-none tracking-tight text-primary">
            2
          </span>
          <span className="mt-2 block text-body-md text-on-surface-variant">
            อีก 2 คิวก่อนถึงคุณ
          </span>
        </div>

        {/* Progress toward the front */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full w-[68%] rounded-full bg-progress-gradient" />
        </div>

        {/* Shop + ETA */}
        <div className="mt-5 flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="content_cut" size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-label-lg font-semibold text-on-surface">
              ร้านตัดผมออร่า สตูดิโอ
            </p>
            <p className="text-label-md text-on-surface-variant">
              ตัดผมชาย · ประมาณ 14:20 น.
            </p>
          </div>
        </div>

        {/* Notify footer */}
        <p className="mt-4 flex items-center gap-2 text-label-md text-on-surface-variant">
          <Icon name="notifications_active" size={16} className="text-primary" />
          จะแจ้งเตือนเมื่อใกล้ถึงคิว
        </p>
      </div>
    </div>
  );
}
