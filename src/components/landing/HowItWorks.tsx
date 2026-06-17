import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Step = {
  n: string;
  /** Material Symbol that gives the step a concrete visual anchor. */
  icon: string;
  title: string;
  body: string;
  /** Tailwind classes for the number bubble background. */
  badge: string;
};

const STEPS: Step[] = [
  {
    n: "1",
    icon: "search",
    title: "เลือกร้าน",
    body: "ค้นหาร้านใกล้ตัวตามหมวดบริการ ดูรีวิว ราคา และสถานะคิวก่อนตัดสินใจ",
    badge: "bg-primary text-on-primary",
  },
  {
    n: "2",
    icon: "event_available",
    title: "กดรับคิว",
    body: "เลือกบริการและช่างที่ต้องการ แล้วกดรับคิวออนไลน์ ระบบบอกเวลารอให้ทันที",
    badge: "bg-secondary text-on-secondary",
  },
  {
    n: "3",
    icon: "notifications_active",
    title: "รับแจ้งเตือน",
    body: "ใช้เวลาที่เหลือทำอย่างอื่นได้สบาย ๆ แล้วเราจะเตือนผ่าน LINE เมื่อใกล้ถึงคิวคุณ",
    badge: "bg-tertiary text-on-tertiary",
  },
];

/**
 * "ใช้งานง่ายใน 3 ขั้นตอน" — static value-prop section on the Cloud surface.
 * SRP: marketing presentation only.
 */
export function HowItWorks() {
  return (
    <section id="how" className="bg-surface-container-low mt-12 md:mt-16">
      <div className="max-w-[1180px] mx-auto w-full px-4 md:px-12 py-14 md:py-18">
        <div className="mb-8">
          <h2 className="font-headline font-semibold text-headline-lg sm:text-display-lg tracking-tight text-on-background">
            ใช้งานง่ายใน 3 ขั้นตอน
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            ตั้งแต่หาร้านจนถึงรับแจ้งเตือน ไม่ต้องโทรจอง ไม่ต้องไปนั่งรอ
          </p>
        </div>

        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="bg-surface rounded-xl border border-outline-variant p-7 transition-all duration-200 hover:shadow-luxury hover:-translate-y-0.5"
            >
              <span
                className={`flex items-center justify-center size-11 rounded-full ${s.badge}`}
              >
                <Icon name={s.icon} size={22} />
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display font-bold text-label-sm text-on-surface-variant">
                  ขั้นที่ {s.n}
                </span>
              </div>
              <h3 className="font-headline font-semibold text-headline-md text-on-surface mt-1 mb-2">
                {s.title}
              </h3>
              <p className="text-body-sm text-on-surface-variant">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-xl border border-outline-variant bg-surface p-6 sm:p-8 shadow-tinted">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h3 className="font-headline font-semibold text-headline-sm text-on-surface">
                พร้อมเริ่มแล้วใช่ไหม
              </h3>
              <p className="text-body-sm text-on-surface-variant mt-1">
                ค้นหาร้านที่ใช่ หรือเปิดร้านของคุณเองบน Quego ได้เลยวันนี้
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:shrink-0">
              <Link
                href="#shops"
                className={buttonClassName({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}
              >
                <Icon name="search" size={18} />
                ค้นหาร้าน
              </Link>
              <Link
                href="/shops/register"
                className={buttonClassName({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}
              >
                <Icon name="storefront" size={18} />
                เปิดร้านกับ Quego
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
