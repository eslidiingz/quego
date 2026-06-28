import Link from "next/link";
import { QuegoWordmark } from "@/components/ui/QuegoWordmark";

type FootCol = { title: string; links: { label: string; href: string }[] };

const COLS: FootCol[] = [
  {
    title: "บริการ",
    links: [
      { label: "ค้นหาร้าน", href: "/#shops" },
      { label: "วิธีใช้งาน", href: "/#how" },
      { label: "คำถามที่พบบ่อย", href: "/#faq" },
    ],
  },
  {
    title: "สำหรับร้าน",
    links: [
      { label: "เปิดร้านกับ Quego", href: "/business" },
      { label: "เข้าสู่ระบบร้าน", href: "/shop/login" },
    ],
  },
];

/**
 * Quego footer on the Ink surface. SRP: site-wide navigation chrome + contact.
 */
export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface/70 dark:bg-surface-container dark:text-on-surface-variant mt-auto px-4 md:px-12 pt-12 pb-9">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex flex-wrap justify-between gap-10 pb-8 border-b border-inverse-on-surface/10 dark:border-outline-variant">
          <div className="max-w-[300px]">
            <QuegoWordmark className="!text-inverse-on-surface dark:!text-on-surface" />
            <p className="text-body-sm text-inverse-on-surface/60 dark:text-on-surface-variant mt-2.5">
              ระบบจองคิวออนไลน์สำหรับร้านและธุรกิจบริการทั่วประเทศไทย
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-14 gap-y-8">
            {COLS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-label-sm font-semibold uppercase tracking-wide text-inverse-on-surface dark:text-on-surface mb-3.5">
                  {col.title}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-body-sm hover:text-primary-fixed-dim dark:hover:text-primary transition-colors"
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-label-md text-inverse-on-surface/45 dark:text-on-surface-variant">
            © {year} Quego · ไม่ต้องรอเก้อ แค่กดจอง
          </p>
          <p className="text-label-sm text-inverse-on-surface/35 dark:text-on-surface-variant">
            เงื่อนไขการใช้งาน · นโยบายความเป็นส่วนตัว
          </p>
        </div>
      </div>
    </footer>
  );
}
