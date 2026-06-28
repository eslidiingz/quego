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
    icon: "add_business",
    title: "สมัครเปิดร้าน",
    body: "กรอกข้อมูลร้าน เพิ่มบริการและเวลาทำการ สมัครเสร็จใช้งานได้ทันที ไม่ต้องรออนุมัติ",
    badge: "bg-primary text-on-primary",
  },
  {
    n: "2",
    icon: "qr_code_2",
    title: "รับคิวออนไลน์",
    body: "แชร์ลิงก์หรือ QR ให้ลูกค้าจองคิวเองได้ตลอด 24 ชม. หรือเพิ่มลูกค้า walk-in หน้าร้าน",
    badge: "bg-secondary text-on-secondary",
  },
  {
    n: "3",
    icon: "campaign",
    title: "เรียกคิว & เตือนลูกค้า",
    body: "เรียกคิวถัดไปจากหน้าจอเดียว ระบบแจ้งเตือนลูกค้าให้อัตโนมัติ ลดคิวหลุด",
    badge: "bg-tertiary text-on-tertiary",
  },
];

/**
 * "เริ่มใช้งานง่ายใน 3 ขั้นตอน" — shop-owner onboarding steps for the
 * `/business` landing page. Mirrors the customer HowItWorks layout for visual
 * consistency. SRP: marketing presentation only.
 */
export function BusinessHowItWorks() {
  return (
    <section className="bg-surface-container-low px-4 md:px-12 py-14 md:py-18">
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="mb-8">
          <h2 className="font-headline font-semibold text-headline-lg sm:text-display-lg tracking-tight text-on-background">
            เริ่มใช้งานง่ายใน 3 ขั้นตอน
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            ตั้งแต่สมัครจนถึงเรียกคิว ไม่ต้องติดตั้งอุปกรณ์ ไม่ต้องอบรม
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
      </div>
    </section>
  );
}
