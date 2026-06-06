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
 * queva landing hero — teal gradient, headline, and a search affordance that
 * seeds the real shop-discovery filter below (via `?q=` + `#shops` anchor) so
 * the box is never a dead end. Category pills are marketing chips that jump to
 * the same discovery section.
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

  const stats: HeroStat[] = [
    { num: shopCount > 0 ? `${shopCount}` : "—", label: "ร้านพร้อมให้จอง" },
    { num: `${categoryCount} หมวด`, label: "บริการความงาม" },
    { num: "~25 นาที", label: "เวลารอที่ประหยัดได้ต่อครั้ง" },
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
    <header className="relative overflow-hidden bg-queva-hero text-on-primary px-4 md:px-12 pt-12 md:pt-20 pb-16 md:pb-20">
      {/* Decorative concentric rings, bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 size-[480px] rounded-full border border-on-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -bottom-20 size-[300px] rounded-full border border-on-primary/10"
      />

      <div className="relative z-10 max-w-[760px] mx-auto md:mx-0 md:ml-[max(0px,calc((100%-1180px)/2))]">
        <span className="queva-reveal inline-flex items-center gap-2 font-display text-label-sm font-medium uppercase tracking-wide text-primary-fixed-dim border border-primary-fixed-dim/40 px-3.5 py-1.5 rounded-full mb-6">
          จองคิวร้านบริการ ทั่วไทย
        </span>

        <h1 className="queva-reveal font-headline font-bold leading-[1.18] tracking-tight text-[34px] sm:text-[44px] lg:text-[56px] mb-4">
          ตัดผม ทำเล็บ นวด สปา
          <br />
          จองคิวไว้ <em className="not-italic text-tertiary-fixed-dim">ไม่ต้องไปนั่งรอ</em>
        </h1>

        <p className="queva-reveal text-body-lg text-on-primary/85 max-w-[560px] mb-8">
          ดูคิวของร้านแบบเรียลไทม์ กดจองล่วงหน้า แล้วรอรับแจ้งเตือนผ่าน LINE
          ตอนใกล้ถึงคิวของคุณ
        </p>

        {/* Search — location + service, seeds the real discovery filter below */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="queva-reveal flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-surface rounded-2xl sm:rounded-full p-2 sm:pl-5 max-w-[680px] shadow-luxury"
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

        {/* Category quick-jumps — real bookable categories that filter below */}
        {categories.length > 0 ? (
          <div className="queva-reveal flex flex-wrap gap-2.5 mt-6">
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
        <dl className="queva-reveal flex flex-wrap gap-x-9 gap-y-4 mt-10">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block font-display font-semibold text-[26px] leading-none">
                  {s.num}
                </span>
                <span className="block text-label-md text-on-primary/70 mt-1">
                  {s.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
