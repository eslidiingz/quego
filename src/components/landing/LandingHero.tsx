"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type HeroStat = { num: string; label: string };

const CATEGORY_PILLS: { label: string; icon: string }[] = [
  { label: "ตัดผม", icon: "content_cut" },
  { label: "แฮร์ซาลอน", icon: "cut" },
  { label: "นวด", icon: "spa" },
  { label: "สปา", icon: "self_improvement" },
  { label: "ทำเล็บ", icon: "back_hand" },
];

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
}: {
  shopCount: number;
  categoryCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const stats: HeroStat[] = [
    { num: shopCount > 0 ? `${shopCount}` : "—", label: "ร้านพร้อมให้จอง" },
    { num: `${categoryCount} หมวด`, label: "บริการความงาม" },
    { num: "~25 นาที", label: "เวลารอที่ประหยัดได้ต่อครั้ง" },
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}#shops` : "/#shops");
  }

  return (
    <header className="relative overflow-hidden bg-queva-hero text-on-primary px-4 md:px-12 pt-12 md:pt-20 pb-16 md:pb-20">
      {/* Decorative concentric rings, bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 size-[480px] rounded-full border border-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -bottom-20 size-[300px] rounded-full border border-white/10"
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

        {/* Search — seeds the real discovery filter below */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="queva-reveal flex flex-col sm:flex-row sm:items-center gap-2 bg-surface rounded-2xl sm:rounded-full p-2 sm:pl-6 max-w-[640px] shadow-luxury"
        >
          <div className="flex items-center gap-2.5 flex-1 text-on-surface px-2 sm:px-0">
            <Icon name="search" size={20} className="text-primary shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาร้าน บริการ หรือย่านที่ต้องการ"
              aria-label="ค้นหาร้านหรือบริการ"
              className="w-full bg-transparent border-none outline-none text-body-md text-on-surface placeholder:text-on-surface-variant py-2.5 sm:py-3"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 shrink-0 rounded-full bg-secondary text-on-secondary font-medium text-label-lg px-7 py-3 shadow-coral-glow hover:bg-secondary-fixed-variant active:scale-[0.98] transition-all"
          >
            <Icon name="search" size={18} />
            ค้นหา
          </button>
        </form>

        {/* Category quick-jumps */}
        <div className="queva-reveal flex flex-wrap gap-2.5 mt-6">
          {CATEGORY_PILLS.map((c, i) => (
            <a
              key={c.label}
              href="#shops"
              className={`inline-flex items-center gap-2 text-label-lg font-medium px-4 py-2 rounded-full border transition-all active:scale-95 ${
                i === 0
                  ? "bg-surface text-primary border-surface"
                  : "bg-white/10 text-on-primary border-white/20 hover:bg-white/20"
              }`}
            >
              <Icon name={c.icon} size={18} />
              {c.label}
            </a>
          ))}
        </div>

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
