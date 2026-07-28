import { Icon } from "@/components/ui/Icon";

type ValueProp = {
  icon: string;
  title: string;
  body: string;
  /** Tailwind classes for the icon tile (bg + text). */
  tile: string;
};

const PROPS: ValueProp[] = [
  {
    icon: "schedule",
    title: "ไม่ต้องโทรจอง",
    body: "กดจองคิวออนไลน์ได้เองทุกเวลา เลือกบริการ ช่าง และเวลาที่สะดวก ไม่ต้องรอสายว่าง",
    tile: "bg-primary/10 text-primary",
  },
  {
    icon: "groups",
    title: "ดูคิวเรียลไทม์",
    body: "เปิดดูเมื่อไหร่ก็เห็นว่าเหลืออีกกี่คิวก่อนถึงคุณ ไม่ต้องโทรถาม ไม่ต้องไปนั่งรอเก้อ",
    tile: "bg-secondary/15 text-secondary",
  },
  {
    icon: "edit_calendar",
    title: "เลื่อน–ยกเลิกเองได้",
    body: "เปลี่ยนใจไม่ต้องโทรบอกร้าน กดเลื่อนเวลาหรือยกเลิกคิวเองได้จากหน้าการจอง",
    tile: "bg-tertiary/15 text-tertiary",
  },
  {
    icon: "phone_iphone",
    title: "ไม่ต้องโหลดแอป",
    body: "ใช้งานผ่านเว็บได้เลยทั้งบนมือถือและคอม ไม่ต้องติดตั้งแอป ไม่ต้องสมัครให้ยุ่งยาก",
    tile: "bg-primary/10 text-primary",
  },
];

/**
 * "ทำไมต้อง Quego" — static value-proposition grid. Pure presentation, no props.
 * SRP: communicate the four core promises of the product.
 */
export function ValueProps() {
  return (
    <section className="px-4 md:px-12 py-14 md:py-18">
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="mb-8 max-w-[640px]">
          <span className="text-label-sm font-medium tracking-wide text-primary">
            ทำไมต้อง Quego
          </span>
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background mt-2">
            จองคิวร้านบริการให้เป็นเรื่องง่าย
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            ออกแบบมาเพื่อคนที่ไม่อยากเสียเวลารอ ตั้งแต่เลือกร้านจนถึงรับบริการ
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROPS.map((p) => (
            <li
              key={p.title}
              className="bg-surface rounded-xl border border-outline-variant p-6"
            >
              <span
                className={`flex items-center justify-center size-12 rounded-xl ${p.tile}`}
              >
                <Icon name={p.icon} size={26} />
              </span>
              <h3 className="font-headline font-semibold text-[18px] text-on-surface mt-4 mb-2">
                {p.title}
              </h3>
              <p className="text-body-sm text-on-surface-variant">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
