# Design: quego Dark Mode — โหมดมืด (สำหรับทุก persona)

อ้างอิง: brand spec `design/aura_queue/DESIGN.md` · tokens `src/app/globals.css` · ระบบ `/design-system`

> สถานะ: **สเปกออกแบบ (design spec)** — จัดทำโดย ux-ui-designer, ตรวจ contrast แบบ
> adversarial (WCAG AA ผ่านทุกคู่). เอกสารนี้ให้ค่า dark hex ครบทุก `--color-*` token,
> วิธีปรับ utility/shadow ที่ไม่ track token, การออกแบบปุ่มสลับธีม, contrast report,
> และแผนการพัฒนา ให้วิศวกรนำไปทำได้ทันที

---

## 1. เป้าหมายและปรัชญา

PO สั่งว่า "สวยงามและใช้ง่าย" โหมดมืดของ quego ไม่ใช่การกลับสีแบบ mechanical แต่คือ
**การย้ายประสบการณ์ Modern-Luxury ทั้งหมดไปอยู่บนพื้นหมึกลึก (deep ink)** — เหมือนเดินจาก
ล็อบบีสว่างเข้าสู่เลาจน์ส่วนตัวยามค่ำ ยังหรู ยังสงบ ยังอุ่น

หลักการ (Material-3 dark + quego brand):

1. **พื้นมืดไม่ใช่ดำสนิท** — ใช้ "หมึกเขียวเข้ม" (deep teal-tinted ink ตระกูล `#0b1513`)
   ให้แบรนด์เขียวซึมผ่านพื้น ไม่เป็นสีเทากลาง/ดำตาย
2. **Elevation กลับทิศ** — โหมดมืด การ์ดยกตัว = พื้น **สว่างขึ้น** (surface-container ยิ่งสูง
   ยิ่งสว่าง) ตามหลัก M3 tonal elevation เพราะเงา tinted บนพื้นมืดแทบมองไม่เห็น
3. **ลดความสดแบรนด์ เพิ่มความสว่าง** — `primary` เปลี่ยน role เป็น teal สว่าง (`#5fd3bf`)
   ใช้เป็น accent/ข้อความ/ปุ่มบนพื้นมืด และพลิก `on-primary` เป็นสีเข้ม
4. **Coral ยังคือ CTA เดียวที่ดึงตา** — coral ปรับให้สดพอบนพื้นมืด (`#ff8b7c`) คุมวินัยหนึ่ง
   CTA ต่อจอ
5. **Gold ต้องหรู ไม่ขุ่น** — VIP/เรตติ้ง/verified ใช้ทองสว่างอุ่น (`#e8b864`) บนพื้นมืดจะ
   "เปล่งประกาย" สวยกว่าโหมดสว่าง — เป็นจุดขายของ dark mode
6. **ไม่มีม่วงเด็ดขาด**
7. **Depth = tonal layering + glow + hairline ring** มากกว่า drop shadow

---

## 2. ตารางโทเค็นโหมดมืด (Dark Token Table)

> override ใน `.dark { … }` (ไม่ใช่ `@theme` ซึ่งเป็น root/light) — gradient/shadow ทุกตัว
> resolve `--color-*` ตอน use-time ด้วย `color-mix` การ override ชุดเดียวจึง re-skin เกือบทั้งแอป

### พื้นหลัง / ตัวอักษรหลัก
| Token | Dark | เหตุผล |
|---|---|---|
| `--color-background` | `#0b1513` | หมึกเขียวเข้มสุด — พื้นเพจ |
| `--color-on-background` | `#e2e9e6` | ข้อความหลัก (≈15:1) |

### Surfaces (elevation = ยิ่งสูง ยิ่งสว่าง)
| Token | Dark | เหตุผล |
|---|---|---|
| `--color-surface` | `#101d1a` | พื้นการ์ดฐาน |
| `--color-surface-dim` | `#0b1513` | สเตปหรี่สุด = เท่า background |
| `--color-surface-bright` | `#1c2c28` | พื้นสว่างสุดสำหรับ emphasis |
| `--color-surface-container-lowest` | `#0a1210` | พื้นเว้า/ช่อง well |
| `--color-surface-container-low` | `#0e1a17` | input/field background |
| `--color-surface-container` | `#13211d` | การ์ดมาตรฐาน |
| `--color-surface-container-high` | `#182824` | การ์ดยกตัว/hover |
| `--color-surface-container-highest` | `#1e2f2a` | modal/active ticket |
| `--color-surface-variant` | `#2a3a35` | พื้นรองสำหรับ chip/แยกบล็อก |
| `--color-surface-tint` | `#5fd3bf` | สีฉาบ elevation = teal สว่าง |

### On-surface / inverse / outline
| Token | Dark | เหตุผล |
|---|---|---|
| `--color-on-surface` | `#e2e9e6` | ข้อความบนการ์ด |
| `--color-on-surface-variant` | `#a7bcb5` | ข้อความรอง/มิวต์ (≈8:1) |
| `--color-inverse-surface` | `#e2e9e6` | inverse (toast เข้มบนพื้นสว่าง) |
| `--color-inverse-on-surface` | `#14302c` | ข้อความบน inverse |
| `--color-outline` | `#7e948d` | เส้นขอบเด่น (ปรับสว่างจาก #6f857f เผื่อ text headroom — ดู §9) |
| `--color-outline-variant` | `#33433e` | hairline เส้นการ์ด |

### Primary — Deep Teal → "teal สว่าง"
| Token | Dark |
|---|---|
| `--color-primary` | `#5fd3bf` |
| `--color-on-primary` | `#00382f` |
| `--color-primary-container` | `#0b5a54` |
| `--color-on-primary-container` | `#c9f0e4` |
| `--color-inverse-primary` | `#0f766e` |
| `--color-primary-fixed` | `#c9f0e4` |
| `--color-primary-fixed-dim` | `#9fe1cb` |
| `--color-on-primary-fixed` | `#07312d` |
| `--color-on-primary-fixed-variant` | `#0b5a54` |

### Secondary — Warm Coral (CTA)
| Token | Dark |
|---|---|
| `--color-secondary` | `#ff8b7c` |
| `--color-on-secondary` | `#5a1a10` |
| `--color-secondary-container` | `#7a2519` |
| `--color-on-secondary-container` | `#ffdad2` |
| `--color-secondary-fixed` | `#ffdad2` |
| `--color-secondary-fixed-dim` | `#f9a99d` |
| `--color-on-secondary-fixed` | `#3a0e07` |
| `--color-on-secondary-fixed-variant` | `#e0563f` |

### Tertiary — Soft Gold (VIP/prestige)
| Token | Dark |
|---|---|
| `--color-tertiary` | `#e8b864` |
| `--color-on-tertiary` | `#3a2900` |
| `--color-tertiary-container` | `#5a4012` |
| `--color-on-tertiary-container` | `#f7e6c0` |
| `--color-tertiary-fixed` | `#f7e6c0` |
| `--color-tertiary-fixed-dim` | `#e8b864` |
| `--color-on-tertiary-fixed` | `#2a1c00` |
| `--color-on-tertiary-fixed-variant` | `#8a6312` |

### Status
| Token | Dark |
|---|---|
| `--color-error` | `#ffb4ab` |
| `--color-on-error` | `#690005` |
| `--color-error-container` | `#93000a` |
| `--color-on-error-container` | `#ffdad6` |
| `--color-success` | `#5fd6a8` |
| `--color-on-success` | `#003824` |
| `--color-success-container` | `#005138` |
| `--color-on-success-container` | `#c6f0de` |

### CSS block พร้อมวาง (`.dark`)

```css
.dark {
  --color-background: #0b1513;
  --color-on-background: #e2e9e6;

  --color-surface: #101d1a;
  --color-surface-dim: #0b1513;
  --color-surface-bright: #1c2c28;
  --color-surface-container-lowest: #0a1210;
  --color-surface-container-low: #0e1a17;
  --color-surface-container: #13211d;
  --color-surface-container-high: #182824;
  --color-surface-container-highest: #1e2f2a;
  --color-surface-variant: #2a3a35;
  --color-surface-tint: #5fd3bf;

  --color-on-surface: #e2e9e6;
  --color-on-surface-variant: #a7bcb5;
  --color-inverse-surface: #e2e9e6;
  --color-inverse-on-surface: #14302c;
  --color-outline: #7e948d; /* lightened from #6f857f for text headroom (see §9) */
  --color-outline-variant: #33433e;

  --color-primary: #5fd3bf;
  --color-on-primary: #00382f;
  --color-primary-container: #0b5a54;
  --color-on-primary-container: #c9f0e4;
  --color-inverse-primary: #0f766e;
  --color-primary-fixed: #c9f0e4;
  --color-primary-fixed-dim: #9fe1cb;
  --color-on-primary-fixed: #07312d;
  --color-on-primary-fixed-variant: #0b5a54;

  --color-secondary: #ff8b7c;
  --color-on-secondary: #5a1a10;
  --color-secondary-container: #7a2519;
  --color-on-secondary-container: #ffdad2;
  --color-secondary-fixed: #ffdad2;
  --color-secondary-fixed-dim: #f9a99d;
  --color-on-secondary-fixed: #3a0e07;
  --color-on-secondary-fixed-variant: #e0563f;

  --color-tertiary: #e8b864;
  --color-on-tertiary: #3a2900;
  --color-tertiary-container: #5a4012;
  --color-on-tertiary-container: #f7e6c0;
  --color-tertiary-fixed: #f7e6c0;
  --color-tertiary-fixed-dim: #e8b864;
  --color-on-tertiary-fixed: #2a1c00;
  --color-on-tertiary-fixed-variant: #8a6312;

  --color-error: #ffb4ab;
  --color-on-error: #690005;
  --color-error-container: #93000a;
  --color-on-error-container: #ffdad6;
  --color-success: #5fd6a8;
  --color-on-success: #003824;
  --color-success-container: #005138;
  --color-on-success-container: #c6f0de;
}
```

---

## 3. โมเดล Elevation ในโหมดมืด

โหมดมืดเงาแทบหาย → ใช้ 3 กลไกแทน:

1. **Tonal layering (หลัก):** ยกตัว = เลื่อนขึ้น container scale
   (`surface` → `-container` → `-high` → `-highest`) ยิ่งสูงยิ่งสว่าง
2. **Hairline ring:** การ์ด static ใช้ `border` สี `outline-variant #33433e` (1px) แทนเงา
3. **Glow:** `shadow-gold-glow` / `shadow-coral-glow` ยังทำงานดี (เป็นแสงเรือง) — บอก
   "ระดับสูง/สำคัญ"

ลำดับ:
- **Low (static card):** `surface-container` + 1px `outline-variant` ring
- **Medium (hover):** `surface-container-high` + ring สว่างขึ้น + `shadow-tinted` (เพิ่ม %)
- **High (modal/active):** `surface-container-highest` + `shadow-luxury` (เข้มขึ้น) + ring
- **Accent glow:** coral glow = CTA ด่วน, gold glow = VIP

---

## 4. Status / VIP ในโหมดมืด

| สถานะ | โหมดมืด |
|---|---|
| รอคิว (Waiting) | ขอบ+ข้อความ `primary #5fd3bf` บนพื้นโปร่ง |
| กำลังเรียก (Now Serving) | `bg-teal-purple-gradient` (teal→gold) re-tint อัตโนมัติ + `on-primary` เข้ม + pulse dot coral |
| ล่าช้า (Delayed) | `secondary-container #7a2519` + `on-secondary-container #ffdad2` |
| VIP | `tertiary-container #5a4012` + ขอบ gold `#e8b864` + backdrop blur |
| พรีเมียม | พื้น teal สว่าง `primary` + ข้อความเข้ม `on-primary` |
| ยืนยันแล้ว (Confirmed) | `secondary-container` + `on-secondary-container` |
| สำเร็จ (Success) | `success #5fd6a8` + `on-success` |
| ไม่มาตามนัด (No-show, OPP-06) | `tertiary #e8b864` (คงใช้ gold ตามเดิม) |
| เลขคิว (Sora number) | `primary #5fd3bf` — focal point |

---

## 5. Utility / Gradient / Shadow (ตัวที่ไม่ track token ต้อง hand-patch)

| utility | dark treatment |
|---|---|
| `.glass-card` | `white 80%` → `.dark .glass-card { background: color-mix(in oklab, #0e1a17 72%, transparent); }` คง `blur(12px)` + เพิ่ม hairline ring `outline-variant 60%` |
| `.bg-quego-panel` | literal `#15706a` ไม่ track token → `.dark` override สองสตอป `#0e3b37 → #06302c` + gold radial เดิม |
| `.bg-gold-shimmer` | literal `#fed488` mid-stop → `.dark` ใช้ `#f0c97a` (ทองอุ่นนุ่ม ไม่แสบตา) |
| `.bg-quego-hero` | token-driven; ลึกเองเพราะ `primary-container` คุมปลาย gradient — คง gold bleed มุมขวาบน (อาจเพิ่ม stop เข้มที่ปลายถ้า teal สว่างเกิน) |
| `.bg-luxury-gradient` / `.bg-progress-gradient` / `.bg-teal-purple-gradient` | token-driven, re-tint อัตโนมัติ ไม่ต้อง patch |
| shadows | `.dark`: tinted 18%→40%, luxury 22%→48%, coral-glow 38%→44%; ใช้ ring + tonal layering เป็น cue หลัก |

---

## 6. ปุ่มสลับธีม (ThemeToggle)

- **คอนโทรล:** ปุ่มไอคอนเดี่ยว sun/moon (`light_mode` / `dark_mode`) ทรงกลม `h-10 w-10`
  (tap ≥44px) ไอคอนสะท้อน "ปลายทางที่จะไป" + `aria-label` ไทย (สลับเป็นโหมดมืด/สว่าง).
  เลือกไอคอนเดี่ยวแทน segmented 3 สถานะ เพราะกลุ่มผู้ใช้คือลูกค้าร้านความงาม — แตะครั้งเดียว
  สลับทันทีคือ mental model ที่คุ้นที่สุด ("ตามระบบ" แก้ด้วย default behavior แทนปุ่มแยก)
- **States:** rest (icon `on-surface-variant`, พื้นโปร่ง) · hover/focus (พื้น
  `surface-container-high` + ขอบ 2px primary) · active (scale .96). icon state seed จาก DOM
  class ตอน mount (กัน hydration mismatch)
- **Default:** ตาม OS เมื่อยังไม่เลือก; เลือกแล้วจำใน `localStorage('quego-theme')` ชนะ OS ครั้งถัดไป
- **ตำแหน่ง:** มุมขวาของ sticky header แต่ละ persona — public `LandingNav` (z-50), `/me` (z-30),
  shop (z-30), admin (z-30); และมุมขวาบน `AuthHeroShell` (absolute z-10+). หน้า discovery
  ที่ไม่มี header ของตัวเองใช้ปุ่มใน `LandingNav` ที่ sticky ครอบทั้งหน้า
- **Transition:** พื้น/ข้อความ ~200ms ease; เคารพ `prefers-reduced-motion` (ตัด transition)

---

## 7. แนวทางเทคนิค (ไม่เพิ่ม dependency)

`package.json` ไม่มี theming dep ใด ๆ และไม่ต้องเพิ่ม (ไม่ใช้ next-themes):

1. เพิ่ม `@custom-variant dark (&:where(.dark, .dark *));` ใน globals.css (หลัง `@import`)
   — Tailwind v4 default `dark:` ผูกกับ media query; ต้องบรรทัดนี้เพื่อให้ class-based ทำงาน
2. นิยาม `.dark { …override --color-* ทั้งหมด… }` (พื้น CSS ปกติ)
3. hand-patch 3 literal (`.dark .bg-quego-panel`, `.dark .bg-gold-shimmer`, `.dark .glass-card`)
   + เพิ่ม % เงาใน `.dark`
4. inline `<script>` no-FOUC ใน `<head>` (`src/app/layout.tsx`) อ่าน localStorage/`matchMedia`
   → toggle `.dark` + `documentElement.style.colorScheme` ก่อน paint + `suppressHydrationWarning`
   บน `<html>`. (ใช้ raw `<script dangerouslySetInnerHTML>` ไม่ใช่ `next/script`)
5. `ThemeToggle.tsx` (`"use client"`) จัดการคลิก + persistence; React Compiler ดูแล memo เอง
6. แก้ hardcoded color ที่ audit เจอ (ดู §8) ให้เป็น semantic token

---

## 8. Audit — hardcoded color ที่ต้องแก้ (27 จุด / 8 ไฟล์)

**ต้องแก้ (breaks-in-dark):**
- `globals.css` — `.bg-quego-panel #15706a`, `.bg-gold-shimmer #fed488`, `.glass-card white 80%`
- `components/landing/LandingFooter.tsx` — 6 จุด (`text-white*`, `border-white/10`, `!text-white`)
  → footer คือ blocker ใหญ่สุด
- `components/ui/Switch.tsx:30` — `after:bg-white` → `after:bg-surface`
- `app/shop/(authed)/profile/BusinessHoursForm.tsx:341` — `bg-white` (thumb) → `bg-surface`
- `components/booking/PublicShopCard.tsx:151` — `bg-white/90` (ป้าย "ปิด") → `bg-surface/90`
- `components/landing/LandingHero.tsx:179` — `bg-white/10 border-white/20` (pill) → `bg-on-primary/*`
- `app/bookings/[id]/page.tsx:44` + `app/shops/[id]/page.tsx:69` — `bg-white/15` (บน hero) → `bg-on-primary/15`
- `components/auth/AuthHeroShell.tsx:94` — `ring-white/40` (บน card) → `ring-outline-variant/40`

**ปรับเพื่อความ consistent (ok-on-colored-surface, อยู่บนพื้น hero สีแล้ว):**
- `AuthHeroShell.tsx` (47/51/55/80) + `LandingHero.tsx` (105/109) — `*-white/*` → `*-on-primary/*`

**ลำดับท้าย (needs-review):** `app/design-system/page.tsx` (146–154) — หน้า showcase no-index

---

## 9. Contrast verification (WCAG AA) — ผ่านทุกคู่

| fg | bg | ratio | เกณฑ์ | ผล |
|---|---|---|---|---|
| on-background `#e2e9e6` | background `#0b1513` | 15.1 | 4.5 | ✅ |
| on-surface `#e2e9e6` | surface `#101d1a` | 14.0 | 4.5 | ✅ |
| on-surface-variant `#a7bcb5` | surface `#101d1a` | 8.7 | 4.5 | ✅ |
| on-surface-variant `#a7bcb5` | surface-container `#13211d` | 8.3 | 4.5 | ✅ |
| on-primary `#00382f` | primary `#5fd3bf` | 7.2 | 4.5 | ✅ |
| on-primary-container `#c9f0e4` | primary-container `#0b5a54` | 6.6 | 4.5 | ✅ |
| on-secondary `#5a1a10` | secondary `#ff8b7c` | 5.8 | 4.5 | ✅ |
| on-tertiary `#3a2900` | tertiary `#e8b864` | 7.7 | 4.5 | ✅ |
| on-error `#690005` | error `#ffb4ab` | 7.7 | 4.5 | ✅ |
| on-success `#003824` | success `#5fd6a8` | 7.3 | 4.5 | ✅ |
| outline `#6f857f` | surface `#101d1a` | 4.4 | 3.0 (UI) | ✅ |
| primary `#5fd3bf` | surface `#101d1a` | 9.5 | 3.0 | ✅ |
| secondary `#ff8b7c` | surface `#101d1a` | 7.6 | 3.0 | ✅ |
| tertiary `#e8b864` | surface `#101d1a` | 9.5 | 3.0 | ✅ |

**จุดเฝ้าระวัง:** `outline #6f857f` บน surface = 4.40:1 — ผ่านเกณฑ์ UI 3:1 ที่ใช้จริง (เป็นเส้นขอบ
ไม่ใช่ตัวอักษร) แต่เฉียดถ้านำไปทำตัวอักษร. **คำแนะนำ (รับมาแล้ว):** ปรับ `--color-outline` เป็น
`#7e948d` (~5.3:1) เพื่อเผื่อ headroom โดยคงโทน sage เดิม (สะท้อนใน CSS block §2 แล้ว)

---

## 10. QA Checklist — จอที่ต้องตรวจในโหมดมืด (375×812 + desktop)

- [ ] Landing `/` — hero teal+gold bleed, nav toggle, footer
- [ ] Shop discovery — chips/การ์ดร้าน, ป้าย "ปิด", ราคา-from
- [ ] Booking flow `/shops/[id]/book` — service→staff→date→time, CTA coral เดียว
- [ ] Booking confirmation `/bookings/[id]` — hero, เลขคิว Sora
- [ ] `/me` queue — ตำแหน่งคิว, live pulse, VIP/gold chip
- [ ] Shop dashboard `/shop` — sidebar (modal portal), header toggle, TodayBookingRow
- [ ] Admin `/admin` — sidebar, ตารางร้าน, ConfirmDialog, presets
- [ ] Auth — AuthHeroShell, ring บน card, PinInput, toggle มุมขวาบน
- [ ] `/design-system` — primitive/Chip/Button/shadow/gradient ครบ
- [ ] Modal/Toast/Dropdown — portal, glass-card เป็นกระจกมืด
- [ ] Switch thumb อ่านได้สองธีม
- [ ] No-FOUC — รีเฟรชในโหมดมืดไม่กระพริบขาว
- [ ] `prefers-reduced-motion` — ปิด transition ธีม
- [ ] Contrast — สุ่มเช็คคู่ coral/gold/teal/on-* ≥ AA
```
