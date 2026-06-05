import { Icon } from "@/components/ui/Icon";

/**
 * "เปิดให้จองอยู่ตอนนี้" — an illustrative live-queue showcase that sells the
 * real-time queue idea. Content is intentionally static (a representative
 * preview, not a live DB row); the only action routes to the real, bookable
 * shop list (#shops).
 *
 * SRP: marketing presentation only — no data, no state.
 */
export function FeaturedQueue() {
  return (
    <section className="max-w-[1180px] mx-auto w-full px-4 md:px-12 pt-12 md:pt-16">
      <div className="flex items-end justify-between gap-5 mb-7">
        <div>
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background">
            เปิดให้จองอยู่ตอนนี้
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            ตัวอย่างสถานะคิวแบบเรียลไทม์ที่คุณจะเห็นในแต่ละร้าน
          </p>
        </div>
        <a
          href="#shops"
          className="hidden sm:inline text-label-lg font-medium text-primary hover:text-secondary transition-colors whitespace-nowrap"
        >
          ดูทั้งหมด →
        </a>
      </div>

      <div className="queva-reveal grid md:grid-cols-[1.1fr_0.9fr] rounded-3xl overflow-hidden shadow-luxury">
        {/* Left — teal visual panel */}
        <div className="bg-queva-panel text-on-primary p-8 md:p-10 min-h-[260px] flex flex-col justify-between">
          <span className="inline-flex items-center gap-2 self-start font-display text-label-sm font-medium uppercase tracking-wide px-3 py-1.5 rounded-full bg-secondary/20 text-secondary-fixed border border-secondary/40">
            <span className="size-2 rounded-full bg-secondary animate-queue-pulse" />
            Live · กำลังเปิด
          </span>
          <div className="mt-auto pt-6">
            <h3 className="font-headline font-semibold text-[26px] leading-tight">
              The Gentleman Barber
            </h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-body-sm text-on-primary/80">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="star" size={16} className="text-tertiary-fixed-dim" />
                4.9 · 312 รีวิว
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="location_on" size={16} className="text-primary-fixed-dim" />
                ทองหล่อ ซอย 10 · 1.2 กม.
              </span>
            </div>
          </div>
        </div>

        {/* Right — queue status panel */}
        <div className="bg-surface text-on-surface p-8 md:p-10 flex flex-col gap-5 justify-center">
          <div className="flex items-baseline gap-3">
            <span className="text-body-sm text-on-surface-variant">กำลังให้บริการคิว</span>
            <span className="font-display font-bold text-[40px] leading-none tracking-tight text-primary">
              B-042
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-surface-container-low rounded-xl p-4">
              <div className="text-label-md text-on-surface-variant">คิวที่รออยู่</div>
              <div className="font-display font-semibold text-[24px] text-secondary mt-0.5">
                3 คิว
              </div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4">
              <div className="text-label-md text-on-surface-variant">เวลารอโดยประมาณ</div>
              <div className="font-display font-semibold text-[24px] text-tertiary mt-0.5">
                ~25 นาที
              </div>
            </div>
          </div>
          <a
            href="#shops"
            className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-secondary text-on-secondary font-medium text-label-lg py-4 shadow-coral-glow hover:bg-secondary-fixed-variant active:scale-[0.98] transition-all"
          >
            <Icon name="confirmation_number" size={20} />
            ดูร้านที่เปิดรับจอง
          </a>
        </div>
      </div>
    </section>
  );
}
