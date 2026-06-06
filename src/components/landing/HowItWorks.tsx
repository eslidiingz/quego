type Step = {
  n: string;
  title: string;
  body: string;
  /** Tailwind classes for the number bubble background. */
  badge: string;
};

const STEPS: Step[] = [
  {
    n: "1",
    title: "เลือกร้าน",
    body: "ค้นหาร้านใกล้ตัวตามหมวดบริการ ดูรีวิว ราคา และสถานะคิวก่อนตัดสินใจ",
    badge: "bg-primary text-on-primary",
  },
  {
    n: "2",
    title: "กดรับคิว",
    body: "เลือกบริการและช่างที่ต้องการ แล้วกดรับคิวออนไลน์ ระบบบอกเวลารอให้ทันที",
    badge: "bg-secondary text-on-secondary",
  },
  {
    n: "3",
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
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background">
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
              className="bg-surface rounded-2xl border border-outline-variant p-7"
            >
              <span
                className={`flex items-center justify-center size-9 rounded-full font-display font-bold text-label-lg ${s.badge}`}
              >
                {s.n}
              </span>
              <h3 className="font-headline font-semibold text-[19px] text-on-surface mt-4 mb-2">
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
