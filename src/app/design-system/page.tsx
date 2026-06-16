import type { Metadata } from "next";
import {
  Section,
  Subsection,
  DemoCard,
  ColorGrid,
  TypeSpecimen,
  TokenTile,
  type ColorToken,
} from "./_components/kit";
import { ComponentGallery } from "./_components/ComponentGallery";

export const metadata: Metadata = {
  title: "quego · Design System",
  description:
    "Living design system ของ quego — tokens, typography และ component จริงทั้งหมด ออกแบบแบบ mobile-first",
  // Internal reference surface — keep it out of search indexes.
  robots: { index: false, follow: false },
};

/* ---------- Token data (mirrors src/app/globals.css @theme) ---------- */

const SURFACES: ColorToken[] = [
  { name: "background", hex: "#f4f6f5" },
  { name: "surface", hex: "#ffffff" },
  { name: "surface-dim", hex: "#e2e7e5" },
  { name: "surface-container-low", hex: "#f4f6f5" },
  { name: "surface-container", hex: "#eef2f0" },
  { name: "surface-container-high", hex: "#e8efed" },
  { name: "surface-container-highest", hex: "#e2e9e6" },
  { name: "surface-variant", hex: "#e8efed" },
];

const PRIMARY: ColorToken[] = [
  { name: "primary", hex: "#0f766e", on: true },
  { name: "primary-container", hex: "#0b5a54", on: true },
  { name: "primary-fixed", hex: "#c9f0e4" },
  { name: "primary-fixed-dim", hex: "#9fe1cb" },
  { name: "inverse-primary", hex: "#9fe1cb" },
];

const SECONDARY: ColorToken[] = [
  { name: "secondary", hex: "#f97362", on: true },
  { name: "secondary-container", hex: "#ffdad2" },
  { name: "secondary-fixed", hex: "#ffdad2" },
  { name: "secondary-fixed-dim", hex: "#f9a99d" },
];

const TERTIARY: ColorToken[] = [
  { name: "tertiary", hex: "#c9912f", on: true },
  { name: "tertiary-container", hex: "#fae2b0" },
  { name: "tertiary-fixed", hex: "#f7e6c0" },
  { name: "tertiary-fixed-dim", hex: "#e8b864" },
];

const STATUS: ColorToken[] = [
  { name: "error", hex: "#ba1a1a", on: true },
  { name: "error-container", hex: "#ffdad6" },
  { name: "success", hex: "#1d9e75", on: true },
  { name: "success-container", hex: "#c6f0de" },
  { name: "outline", hex: "#8a9b95" },
  { name: "outline-variant", hex: "#d5deda" },
];

const SPACING: { token: string; px: number }[] = [
  { token: "base", px: 8 },
  { token: "stack-sm", px: 12 },
  { token: "margin-mobile", px: 16 },
  { token: "gutter / stack-md", px: 24 },
  { token: "stack-lg", px: 40 },
  { token: "margin-desktop", px: 48 },
];

// Literal classes so Tailwind's JIT emits them.
const RADII: { token: string; meta: string; cls: string }[] = [
  { token: "radius-sm", meta: "4px", cls: "rounded-sm" },
  { token: "radius-md", meta: "8px", cls: "rounded-md" },
  { token: "radius-lg", meta: "16px", cls: "rounded-lg" },
  { token: "radius-xl", meta: "24px", cls: "rounded-xl" },
  { token: "full", meta: "pill", cls: "rounded-full" },
];

const SHADOWS: { token: string; cls: string }[] = [
  { token: "shadow-tinted", cls: "shadow-tinted" },
  { token: "shadow-luxury", cls: "shadow-luxury" },
  { token: "shadow-gold-glow", cls: "shadow-gold-glow" },
  { token: "shadow-coral-glow", cls: "shadow-coral-glow" },
];

const GRADIENTS: { token: string; cls: string }[] = [
  { token: "bg-quego-hero", cls: "bg-quego-hero" },
  { token: "bg-quego-panel", cls: "bg-quego-panel" },
  { token: "bg-luxury-gradient", cls: "bg-luxury-gradient" },
  { token: "bg-teal-purple-gradient", cls: "bg-teal-purple-gradient" },
  { token: "bg-progress-gradient", cls: "bg-progress-gradient" },
  { token: "bg-gold-shimmer", cls: "bg-gold-shimmer" },
];

const PRINCIPLES: { icon: string; title: string; body: string }[] = [
  {
    icon: "smartphone",
    title: "Mobile-first",
    body: "ออกแบบที่ 375×812 ก่อนเสมอ แล้วค่อย enhance ขึ้นด้วย min-width — จุดสลับหลักคือ sm: (640px)",
  },
  {
    icon: "touch_app",
    title: "Touch target ≥ 44px",
    body: "ปุ่มขนาด md (h-11) คือ baseline ที่นิ้วแตะได้สบาย ทุก control เชิงโต้ตอบยึดเกณฑ์นี้",
  },
  {
    icon: "translate",
    title: "ตัวอักษรไทยมาก่อน",
    body: "Anuphan รับงานเนื้อหา/หัวข้อไทยทั้งหมด, Sora เสริมเฉพาะตัวเลข/โลโก้ Latin (display)",
  },
  {
    icon: "task_alt",
    title: "Validate ตอน submit",
    body: "ไม่ validate ระหว่างพิมพ์/blur, required ทำเครื่องหมายด้วย RequiredMark (prop) ไม่ใช่ native HTML",
  },
  {
    icon: "balance",
    title: "ปุ่มคู่สมดุล",
    body: "ปุ่มที่อยู่คู่กันต้องกว้าง/สูงเท่ากัน บรรทัดเดียว ไอคอนสไตล์เดียวกัน",
  },
  {
    icon: "layers",
    title: "Overlay portal",
    body: "Modal/Toast portal ไป document.body เสมอ เพื่อหนี stacking context ของ ancestor ที่มี transform",
  },
];

const NAV: { id: string; label: string }[] = [
  { id: "principles", label: "หลักการ" },
  { id: "color", label: "สี" },
  { id: "type", label: "ตัวอักษร" },
  { id: "spacing", label: "ระยะห่าง" },
  { id: "radius", label: "มุมโค้ง" },
  { id: "elevation", label: "เงา & ไล่สี" },
  { id: "components", label: "คอมโพเนนต์" },
];

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* ---------- Hero ---------- */}
      <header className="bg-quego-hero px-4 pb-10 pt-12 text-white sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-label-sm uppercase tracking-[0.3em] text-white/70">
            Living design system
          </p>
          <h1 className="mt-2 font-display text-display-lg">quego</h1>
          <p className="mt-3 max-w-prose text-body-md text-white/80">
            แหล่งอ้างอิงเดียวของทีม — token, typography และ component
            ทุกตัว render จากโค้ดจริงใน <code className="text-white">globals.css</code> และ{" "}
            <code className="text-white">src/components</code> จึงไม่มีวันต่างจากแอปจริง
            ออกแบบด้วยหลัก mobile-first
          </p>
        </div>
      </header>

      {/* ---------- Sticky section nav (horizontal scroll on mobile) ---------- */}
      <nav className="sticky top-0 z-40 border-b border-outline-variant bg-surface/85 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-12 sm:px-6">
        {/* ---------- Principles ---------- */}
        <Section
          id="principles"
          eyebrow="Foundations"
          title="หลักการ"
          description="กติกาที่ทุก surface ของ quego ยึดร่วมกัน — สรุปจาก convention จริงของโปรเจกต์"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <DemoCard key={p.title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary">
                  <span
                    className="material-symbols-outlined leading-none"
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                    aria-hidden
                  >
                    {p.icon}
                  </span>
                </span>
                <div>
                  <p className="text-label-lg text-on-surface">{p.title}</p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{p.body}</p>
                </div>
              </DemoCard>
            ))}
          </div>
        </Section>

        {/* ---------- Color ---------- */}
        <Section
          id="color"
          eyebrow="Foundations"
          title="สี"
          description="Material-3 tonal roles — สลับชุดเดียวที่ @theme แล้วทั้งแอปเปลี่ยนตาม Deep Teal (primary) · Warm Coral (secondary/CTA) · Soft Gold (tertiary/premium)"
        >
          <div className="space-y-6">
            <Subsection title="Surfaces & background">
              <ColorGrid swatches={SURFACES} />
            </Subsection>
            <Subsection title="Primary · Deep Teal">
              <ColorGrid swatches={PRIMARY} />
            </Subsection>
            <Subsection title="Secondary · Warm Coral (CTA)">
              <ColorGrid swatches={SECONDARY} />
            </Subsection>
            <Subsection title="Tertiary · Soft Gold (premium / VIP)">
              <ColorGrid swatches={TERTIARY} />
            </Subsection>
            <Subsection title="Status & outline">
              <ColorGrid swatches={STATUS} />
            </Subsection>
          </div>
        </Section>

        {/* ---------- Typography ---------- */}
        <Section
          id="type"
          eyebrow="Foundations"
          title="ตัวอักษร"
          description="Sora นำ display/ตัวเลข (Latin) + Anuphan รับภาษาไทยทั้งหมด · ค่าในตารางคือ size / line-height · weight"
        >
          <DemoCard>
            <TypeSpecimen className="text-display-lg font-display" token="display-lg" spec="30 / 42 · 700" sample="คิวลื่นไหล B-042" />
            <TypeSpecimen className="text-display-sm font-display" token="display-sm" spec="26 / 32 · 700" sample="รอ ~25 นาที" />
            <TypeSpecimen className="text-headline-lg" token="headline-lg" spec="22 / 32 · 600" sample="ค้นหาร้านใกล้คุณ" />
            <TypeSpecimen className="text-headline-md" token="headline-md" spec="18 / 26 · 500" sample="หัวข้อการ์ดบริการ" />
            <TypeSpecimen className="text-headline-sm" token="headline-sm" spec="16 / 24 · 600" sample="หัวข้อย่อย / เวลา" />
            <TypeSpecimen className="text-body-lg" token="body-lg" spec="16 / 24 · 400" sample="เนื้อหาหลักอ่านสบายตา" />
            <TypeSpecimen className="text-body-md" token="body-md" spec="16 / 24 · 400" sample="ข้อความปกติในแอป" />
            <TypeSpecimen className="text-body-sm" token="body-sm" spec="15 / 24 · 400" sample="คำอธิบายรอง" />
            <TypeSpecimen className="text-label-lg" token="label-lg" spec="15 / 20 · 600" sample="ป้ายปุ่ม CTA" />
            <TypeSpecimen className="text-label-md" token="label-md" spec="14 / 20 · 500" sample="ป้ายกำกับ / แจ้งเตือน" />
            <TypeSpecimen className="text-label-sm uppercase tracking-wider" token="label-sm" spec="12 / 18 · 500" sample="CAPTION / เมนูล่าง" />
          </DemoCard>
        </Section>

        {/* ---------- Spacing ---------- */}
        <Section
          id="spacing"
          eyebrow="Foundations"
          title="ระยะห่าง"
          description="ฐาน 8px · gutter 24px เป็นมาตรฐานขั้นต่ำระหว่างคอมโพเนนต์ · ขอบจอ 16px (มือถือ) → 48px (เดสก์ท็อป)"
        >
          <DemoCard className="space-y-3">
            {SPACING.map((s) => (
              <div key={s.token} className="flex items-center gap-4">
                <div className="h-3 rounded-full bg-primary" style={{ width: `${s.px}px` }} />
                <p className="text-label-md text-on-surface">{s.token}</p>
                <p className="text-label-sm text-on-surface-variant">{s.px}px</p>
              </div>
            ))}
          </DemoCard>
        </Section>

        {/* ---------- Radius ---------- */}
        <Section
          id="radius"
          eyebrow="Foundations"
          title="มุมโค้ง"
          description="ปุ่ม CTA เป็น pill (full) · option tile / การ์ดเป็น rounded-xl · ฟิลด์ฟอร์มเป็น rounded-lg"
        >
          <DemoCard>
            <div className="grid grid-cols-3 gap-5 sm:grid-cols-5">
              {RADII.map((r) => (
                <TokenTile key={r.token} label={r.token} meta={r.meta}>
                  <div className={`size-16 border-2 border-primary bg-primary-container/15 ${r.cls}`} />
                </TokenTile>
              ))}
            </div>
          </DemoCard>
        </Section>

        {/* ---------- Elevation & gradients ---------- */}
        <Section
          id="elevation"
          eyebrow="Foundations"
          title="เงา & ไล่สี"
          description="เงาเป็นโทนแบรนด์ (tinted) ไม่ใช่เทากลาง — ใช้บอกระดับความสำคัญ · ไล่สีใช้ใน hero, panel, progress, status"
        >
          <div className="space-y-6">
            <Subsection title="Shadows">
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                {SHADOWS.map((s) => (
                  <TokenTile key={s.token} label={s.token}>
                    <div className={`size-20 rounded-xl bg-surface ${s.cls}`} />
                  </TokenTile>
                ))}
              </div>
            </Subsection>
            <Subsection title="Gradients">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {GRADIENTS.map((g) => (
                  <div key={g.token} className="overflow-hidden rounded-xl border border-outline-variant">
                    <div className={`h-20 ${g.cls}`} />
                    <p className="bg-surface-container-lowest px-3 py-2 text-label-sm text-on-surface-variant">
                      {g.token}
                    </p>
                  </div>
                ))}
              </div>
            </Subsection>
          </div>
        </Section>

        {/* ---------- Components ---------- */}
        <Section
          id="components"
          eyebrow="Components"
          title="คอมโพเนนต์"
          description="render จาก src/components จริงทั้งหมด — ลองกด/พิมพ์/เปิด overlay ได้เลย"
        >
          <ComponentGallery />
        </Section>
      </div>
    </main>
  );
}
