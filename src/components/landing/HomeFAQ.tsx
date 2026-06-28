"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: "ต้องโหลดแอปไหม",
    a: "ไม่ต้องโหลดแอป ใช้งานผ่านเว็บได้เลยทั้งบนมือถือและคอมพิวเตอร์ เพียงเปิดเว็บ เลือกร้าน แล้วกดจองคิวได้ทันที",
  },
  {
    q: "จองแล้วยกเลิกหรือเลื่อนคิวได้ไหม",
    a: "ได้ คุณสามารถเลื่อนหรือยกเลิกคิวได้เองจากหน้าการจองของคุณ ภายในเวลาที่แต่ละร้านกำหนดไว้ก่อนถึงคิว",
  },
  {
    q: "ร้านสมัครยังไง เสียเงินไหม",
    a: "เจ้าของร้านกดสมัครเปิดร้านได้เลยที่หน้า “เปิดร้านกับ Quego” กรอกข้อมูลร้านแล้วใช้งานได้ทันที ไม่ต้องรออนุมัติ และเริ่มต้นใช้งานได้ฟรี",
  },
  {
    q: "ระบบแจ้งเตือนทำงานยังไง",
    a: "ระบบจะส่งแจ้งเตือนให้คุณเมื่อใกล้ถึงคิว หรือเมื่อสถานะการจองของคุณเปลี่ยนแปลง คุณจึงไม่พลาดคิวแม้ออกไปทำธุระข้างนอก",
  },
  {
    q: "ดูคิวเรียลไทม์ยังไง",
    a: "หลังจองคิวแล้ว เปิดหน้าการจองของคุณเพื่อดูว่าเหลืออีกกี่คิวก่อนถึงคุณ ระบบอัปเดตสถานะคิวให้โดยอัตโนมัติ ไม่ต้องโทรถามร้าน",
  },
];

/**
 * "คำถามที่พบบ่อย" — accessible accordion. Each row is a real <button> toggling
 * aria-expanded, so it works with keyboard + screen readers (no native <details>
 * so we can animate + control the chevron). Static content; client only because
 * each panel's open state is local UI.
 *
 * SRP: present FAQ entries with one expandable answer each.
 */
export function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 md:px-12 py-14 md:py-18 bg-surface-container-low">
      <div className="max-w-[760px] mx-auto w-full">
        <div className="mb-8 text-center">
          <span className="text-label-sm font-medium uppercase tracking-wide text-primary">
            คำถามที่พบบ่อย
          </span>
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background mt-2">
            เรื่องที่หลายคนสงสัย
          </h2>
        </div>

        <ul className="grid gap-3">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <li
                key={item.q}
                className="bg-surface rounded-xl border border-outline-variant overflow-hidden"
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <span className="font-headline font-semibold text-[17px] text-on-surface">
                    {item.q}
                  </span>
                  <Icon
                    name="expand_more"
                    size={24}
                    className={`shrink-0 text-on-surface-variant transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="px-5 pb-5 -mt-1"
                >
                  <p className="text-body-sm text-on-surface-variant">{item.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
