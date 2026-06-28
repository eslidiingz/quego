import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/**
 * Closing call-to-action band for the `/business` shop-landing page. Branded
 * teal panel so the final "เปิดร้านฟรี" prompt carries weight. The CTA points
 * straight at the registration flow (createShop lands status=approved, so there
 * is genuinely no approval wait — the copy leans on that).
 * SRP: one last conversion nudge to /shops/register.
 */
export function BusinessCta() {
  return (
    <section className="px-4 md:px-12 pb-14 md:pb-18">
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="rounded-xl bg-quego-panel text-on-primary p-8 sm:p-10 shadow-luxury">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-[560px]">
              <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight">
                พร้อมเปิดร้านแล้วใช่ไหม
              </h2>
              <p className="text-body-md text-on-primary/80 mt-2">
                สมัครฟรีวันนี้ สมัครเสร็จใช้งานได้ทันที เริ่มรับลูกค้าจองคิวออนไลน์ได้เลย
              </p>
            </div>
            <Link
              href="/shops/register"
              className="inline-flex items-center justify-center gap-2 shrink-0 rounded-full bg-secondary text-on-secondary font-medium text-label-lg px-7 py-3.5 shadow-coral-glow hover:bg-secondary-fixed-variant active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out"
            >
              <Icon name="storefront" size={20} />
              เปิดร้านฟรี
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
