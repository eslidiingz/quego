import Link from "next/link";
import { QuevaWordmark } from "@/components/landing/LandingNav";

type FootCol = { title: string; links: { label: string; href: string }[] };

const COLS: FootCol[] = [
  {
    title: "บริการ",
    links: [
      { label: "ค้นหาร้าน", href: "/#shops" },
      { label: "หมวดบริการ", href: "/#shops" },
      { label: "วิธีใช้งาน", href: "/#how" },
    ],
  },
  {
    title: "สำหรับร้านค้า",
    links: [
      { label: "ลงทะเบียนร้าน", href: "/shops/register" },
      { label: "จัดการคิว", href: "/shop/login" },
      { label: "เข้าสู่ระบบร้าน", href: "/shop/login" },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { label: "คำถามที่พบบ่อย", href: "/#how" },
      { label: "ติดต่อเรา", href: "/#how" },
      { label: "เงื่อนไขการใช้งาน", href: "/#how" },
    ],
  },
];

/**
 * queva footer on the Ink surface. SRP: site-wide navigation chrome only.
 */
export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-on-background text-white/70 mt-auto px-4 md:px-12 pt-12 pb-9">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex flex-wrap justify-between gap-8 pb-7 border-b border-white/10">
          <div className="max-w-[280px]">
            <QuevaWordmark className="!text-white" />
            <p className="text-body-sm text-white/60 mt-2.5">
              ระบบจองคิวสำหรับร้านบริการความงามและสุขภาพทั่วประเทศไทย
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-14 gap-y-8">
            {COLS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-label-sm font-semibold uppercase tracking-wide text-white mb-3.5">
                  {col.title}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-body-sm hover:text-primary-fixed-dim transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="text-label-md text-white/45 mt-5">
          © {year} queva · ไม่ต้องรอเก้อ แค่กดจอง
        </p>
      </div>
    </footer>
  );
}
