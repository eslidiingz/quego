import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";

type OwnerPerk = { icon: string; text: string };

const PERKS: OwnerPerk[] = [
  { icon: "bolt", text: "สมัครเปิดร้านได้เลย ใช้งานทันที ไม่ต้องรออนุมัติ" },
  { icon: "payments", text: "ฟรี ไม่มีค่าธรรมเนียมแรกเข้า เริ่มรับคิวออนไลน์ได้ทันที" },
  { icon: "notifications_active", text: "ลูกค้ารับแจ้งเตือนผ่าน LINE ลดคิวหลุด ลดการไม่มาตามนัด" },
  { icon: "dashboard", text: "จัดการคิว พนักงาน และบริการได้จากหน้าจอเดียว" },
];

/**
 * "สำหรับเจ้าของร้าน" — conversion block aimed at shop owners. Self-serve signup
 * is the hook (createShop lands status=approved, so there is genuinely no
 * approval wait). Static; the only interactive element is the CTA link.
 *
 * SRP: present the owner value proposition + drive to /shops/register.
 */
export function ForShopOwners() {
  return (
    <section id="for-owners" className="px-4 md:px-12 py-14 md:py-18">
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* ── Left: copy + perks + CTA ──────────────────────────────── */}
          <div className="max-w-[560px]">
            <span className="text-label-sm font-medium uppercase tracking-wide text-primary">
              สำหรับเจ้าของร้าน
            </span>
            <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background mt-2">
              เปิดรับคิวออนไลน์ให้ร้านของคุณ
            </h2>
            <p className="text-body-md text-on-surface-variant mt-3">
              ให้ลูกค้าจองคิวเองได้ตลอด 24 ชั่วโมง ลดงานรับโทรศัพท์
              จัดการคิวหน้าร้านได้ง่ายขึ้น เริ่มต้นฟรี สมัครเสร็จใช้งานได้ทันที
            </p>

            <ul className="mt-6 grid gap-3.5">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-start gap-3">
                  <span className="flex items-center justify-center size-8 shrink-0 rounded-lg bg-primary/10 text-primary">
                    <Icon name={p.icon} size={18} />
                  </span>
                  <span className="text-body-sm text-on-surface pt-1">
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/shops/register"
              className={buttonClassName({ size: "lg", className: "mt-8" })}
            >
              <Icon name="storefront" size={20} />
              เปิดร้านกับ Quego
            </Link>
          </div>

          {/* ── Right: mini dashboard mock on the branded panel ───────── */}
          <OwnerDashboardMock />
        </div>
      </div>
    </section>
  );
}

/**
 * Decorative marketing mock of the shop's "วันนี้" dashboard glance — a couple
 * of stat tiles + a queue row on the branded teal panel. Decorative only.
 */
function OwnerDashboardMock() {
  return (
    <div
      aria-hidden
      className="relative justify-self-center lg:justify-self-end w-full max-w-[460px]"
    >
      <div className="rounded-xl bg-quego-panel text-on-primary p-6 shadow-luxury">
        <div className="flex items-center justify-between">
          <span className="text-label-md font-medium text-on-primary/80">
            ภาพรวมวันนี้
          </span>
          <span className="inline-flex items-center gap-1.5 text-label-sm text-on-primary/80">
            <span className="relative flex size-2">
              <span className="animate-queue-pulse absolute inline-flex size-full rounded-full bg-tertiary-fixed-dim/50" />
              <span className="relative inline-flex size-2 rounded-full bg-tertiary-fixed-dim" />
            </span>
            อัปเดตสด
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-on-primary/10 p-4">
            <span className="block font-display font-bold text-[28px] leading-none">
              12
            </span>
            <span className="block text-label-md text-on-primary/75 mt-1.5">
              คิววันนี้
            </span>
          </div>
          <div className="rounded-lg bg-on-primary/10 p-4">
            <span className="block font-display font-bold text-[28px] leading-none">
              8
            </span>
            <span className="block text-label-md text-on-primary/75 mt-1.5">
              ที่ว่างเหลือ
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-lg bg-on-primary/10 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim font-display font-bold text-label-lg">
            3
          </span>
          <div className="min-w-0">
            <p className="truncate text-label-lg font-semibold text-on-primary">
              คิวถัดไป · คุณมานี
            </p>
            <p className="text-label-md text-on-primary/70">
              ทำเล็บเจล · 13:30 น.
            </p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full bg-secondary px-3 py-1 text-label-sm font-semibold uppercase tracking-wider text-on-secondary">
            เรียกคิว
          </span>
        </div>
      </div>
    </div>
  );
}
