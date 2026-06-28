import { Icon } from "@/components/ui/Icon";

type OwnerPerk = {
  icon: string;
  title: string;
  body: string;
  /** Tailwind classes for the icon tile (bg + text). */
  tile: string;
};

const PERKS: OwnerPerk[] = [
  {
    icon: "bolt",
    title: "สมัครเสร็จใช้ได้ทันที",
    body: "เปิดร้านได้เลย ไม่ต้องรออนุมัติ เริ่มรับคิวออนไลน์ได้ภายในไม่กี่นาที",
    tile: "bg-primary/10 text-primary",
  },
  {
    icon: "payments",
    title: "ฟรี ไม่มีค่าแรกเข้า",
    body: "เริ่มต้นใช้งานฟรี ไม่มีค่าธรรมเนียมแรกเข้า ไม่ต้องผูกบัตร",
    tile: "bg-secondary/15 text-secondary",
  },
  {
    icon: "notifications_active",
    title: "ลดคิวหลุดด้วยแจ้งเตือน",
    body: "ลูกค้ารับแจ้งเตือนอัตโนมัติเมื่อใกล้ถึงคิว ลดการไม่มาตามนัด",
    tile: "bg-tertiary/15 text-tertiary",
  },
  {
    icon: "dashboard",
    title: "จัดการได้จากจอเดียว",
    body: "ดูคิว จัดการพนักงานและบริการ พร้อมจอแสดงคิวหน้าร้าน ครบในที่เดียว",
    tile: "bg-primary/10 text-primary",
  },
];

/**
 * "ทำไมร้านถึงเลือก Quego" — value-proposition grid for the `/business`
 * shop-landing page. Pure presentation, no props.
 * SRP: communicate the four core promises to a shop owner.
 */
export function BusinessValueProps() {
  return (
    <section className="px-4 md:px-12 py-14 md:py-18">
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="mb-8 max-w-[640px]">
          <span className="text-label-sm font-medium tracking-wide text-primary">
            ทำไมร้านถึงเลือก Quego
          </span>
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background mt-2">
            เครื่องมือจัดการคิวที่ใช้ได้จริง เริ่มต้นฟรี
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            ออกแบบมาเพื่อทุกธุรกิจที่มีลูกค้าต่อคิว ลดงานหน้าร้าน เพิ่มลูกค้ากลับมาซ้ำ
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((p) => (
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
