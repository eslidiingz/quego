# PRD: แยกหน้าแรกลูกค้า / หน้าร้านค้า `/business` (Landing split) — OPP-22

> Lean PRD. สังเคราะห์จาก cross-functional review (product-manager + ux-ui-designer
> + marketing-manager) 2026-06-28 หลัง verify โค้ดจริงใน `src/app/page.tsx`,
> `src/components/landing/{ForShopOwners,LandingNav,LandingHero}.tsx`,
> `src/components/booking/ShopDiscovery.tsx`, `src/proxy.ts`. ทั้งสามมุมมอง
> **บรรจบที่ข้อเสนอเดียวกัน**: หน้าแรกวันนี้พยายามรับใช้ 3 persona พร้อมกัน และ
> ฝัง supply funnel (คอขวดจริงของ marketplace) ไว้ใต้ demand funnel.

## 1. ปัญหา & เป้าหมาย

หน้าแรก `src/app/page.tsx` วันนี้เป็น **หน้าเดียวที่รวม 3 งานพร้อมกัน** (โค้ดเรียกตัวเอง
ว่า "hybrid"): (1) หน้า marketing สำหรับผู้มาใหม่ (2) หน้า search/discovery สำหรับ
ลูกค้าที่จะจอง (3) หน้าโฆษณาชวนร้านสมัคร — และผลคือทุกฝ่ายได้ประสบการณ์ที่ไม่ดีที่สุด:

- **Persona collision** — `<ForShopOwners />` (โฆษณาฝั่งร้าน) อยู่ใน flow ของลูกค้าที่
  `page.tsx:141`, ลึก ~4.7 จอบนมือถือ → ลูกค้าไม่อยากเห็น ส่วนร้านแทบไม่เลื่อนถึง.
  `OpenShopCtaCard` (CTA "เปิดร้าน") ยังแทรกอยู่ใน grid ผลค้นหาของลูกค้า
  (`ShopDiscovery.tsx:188`).
- **Supply funnel ฝังใต้ demand funnel** — North-star = shop activation แต่ CTA สมัคร
  ร้าน (สำคัญสุด) ถูกฝังลึกสุด. **ไม่มี route `/business` หรือ `/for-shops` เลย**
  (verified: ไม่พบใน `src/app/`) → แชร์ลิงก์ recruit ร้านสะอาด ๆ ทำไม่ได้ ต้องส่งหน้า
  ลูกค้าให้ร้านดู.
- **SEO ฝั่งร้าน = 0** — `metadata.keywords` ที่ `page.tsx:25-33` เป็น demand ล้วน
  ("จองคิวร้าน...") ไม่มีคำว่า "เปิดร้าน / ระบบจัดการคิว / รับจองออนไลน์" → ร้านที่
  เสิร์ช Google ด้วย commercial intent หาเราไม่เจอ.
- **Social proof เปราะตอน cold start** — hero stat โชว์จำนวนร้านเฉพาะเมื่อ
  `shopCount > 0` (`LandingHero.tsx:59-64`) → ช่วงเริ่มต้นที่ร้านยังน้อย หน้าจะดู "ร้าง"
  พอดีกับช่วงที่ต้องการความน่าเชื่อถือที่สุด.

ข้อดีที่ **ห้ามรื้อ**: `bg-quego-hero` + display-xl headline + coral CTA + `LiveQueueMock`
(สื่อ core value real-time queue ได้ดี) + search ที่ seed `?q`/`?cat`/`#shops` เข้า
discovery จริง (ไม่ dead-end). ปัญหาไม่ใช่คุณภาพของแต่ละ section — แต่คือ **ลำดับ + การ
บังคับให้ทุก persona อยู่หน้าเดียวกัน**.

- **Persona:** ลูกค้า (เจ้าของหน้า `/`) + เจ้าของร้าน (เจ้าของหน้า `/business` ใหม่).
- **Job-to-be-done (ลูกค้า):** "เปิด quego.app แล้วเจอร้าน+จองได้เร็วที่สุด โดยไม่ถูกขัด
  ด้วยโฆษณาผิดกลุ่ม."
- **Job-to-be-done (ร้าน):** "เข้าใจว่า Quego ให้อะไรกับร้านของฉัน + objection ถูกตอบครบ
  + สมัครได้ทันที (สมัครเสร็จใช้ได้เลย — `createShop` ลง `status=approved`)."
- **Success metric:**
  - ลูกค้า: ลด scroll-depth กว่าจะเห็นร้านแรก (วันนี้ ~1.2 จอ mobile); proxy =
    สัดส่วน session ที่ถึง `#shops`/คลิกการ์ดร้าน.
  - ร้าน: มี supply funnel ที่วัดแยกได้ (visit `/business` → `/shops/register` →
    add service → first booking); ปลดล็อก SEO/recruit-link ฝั่งร้าน.

## 2. ขอบเขต

**In scope:**

- **B1 — สร้าง `/business` (supply landing เต็มรูป)** ที่ `src/app/business/page.tsx`:
  ย้ายเนื้อหา `ForShopOwners` มาเป็นแกนแล้วขยายเป็นหน้าเต็ม — hero ฝั่งร้าน (reuse
  pattern `bg-quego-hero` + `OwnerDashboardMock`), PERKS 4 ข้อ (จาก
  `ForShopOwners.tsx:7-12`), "ใช้งานยังไง" 3 ขั้นฝั่งร้าน (reuse layout `HowItWorks`),
  **dual CTA**: "เปิดร้านฟรี" → `/shops/register` + "เข้าสู่ระบบร้าน" → `/shop/login`,
  closing CTA band, footer เดิม. **metadata/OG/keywords แยกฝั่งร้าน**.
- **B2 — ลด `/` ให้เป็น customer-first**: ลบ `<ForShopOwners />` ออกจาก `page.tsx`
  (import บรรทัด 7, render บรรทัด 141) แทนด้วย **banner บาง 1 บรรทัด** ก่อน
  `LandingFooter` ("เป็นเจ้าของร้าน? เปิดร้านฟรี →" → `/business`). ดึง `#shops` ขึ้น
  ใกล้ fold (ลด `pt-14 md:pt-18` ที่ `page.tsx:106`).
- **B3 — Nav entry ฝั่งร้าน**: เพิ่มลิงก์ "เปิดร้าน" → `/business` ใน `LandingNav`
  (`LandingNav.tsx`) แบบ ghost/text สี `primary` (low-emphasis ไม่แย่ง coral CTA
  ลูกค้า) แสดงทั้ง desktop + mobile.
- **B4 — `OpenShopCtaCard` ใน discovery**: เปลี่ยนปลายทางจาก `/shops/register` →
  `/business` (ให้ร้านได้อ่าน proof ก่อน) — ดู open Q §9 เรื่องจะคงไว้หรือเอาออก.
- **B5 — Social proof ที่ไม่เปราะ**: แก้ hero stat ให้ไม่ดู "ร้าง" ตอน cold start
  (ดู §5 data task — ตัวเลือก: ใช้ count จริงที่มี หรือเปลี่ยนเป็น value-statement
  แทนตัวเลขจนกว่าจะมี supply พอ).

**Out of scope (อย่าทำในงานนี้ — แยก PRD/OPP):**

- ❌ **หน้า "ชวนเพื่อน" ใน `/me`** (referral UI) — backend OPP-15 ship แล้ว
  (`src/lib/loyalty/`, `loyalty.ts`) แต่ **ไม่มีหน้า UI ใน `/me`** (verified: `/me` มีแค่
  bookings/profile/rewards/waitlist). = **OPP-23** แยก. ROI สูง แต่คนละ surface.
- ❌ **Post-register activation checklist** ("สมัคร→เพิ่มบริการ→รับ QR") = **OPP-24**
  แยก. แก้ activation leak ("ร้าน approved แต่ยังจองไม่ได้เพราะไม่มี active service").
- ❌ **Pricing section / หน้า pricing บน `/business`** — ยังไม่ตัดสิน pricing (รอ data
  จริง, ดู North-star bet #3). `/business` v1 ขายด้วย "ฟรี + ใช้ทันที" เท่านั้น.
- ❌ **LINE reply-first redesign / คุม push-quota** = งาน OPP-02 / cost engineering.
  เป็น *เงื่อนไข* ที่ทำให้คำว่า "ฟรี + เตือน LINE" บน `/business` เป็นจริง — flag ใน §9.
- ❌ Interstitial "ฉันเป็นลูกค้า / ฉันเป็นร้าน" เป็นหน้าแรก — **อย่าทำ** (เพิ่ม 1 คลิก
  ให้ลูกค้า ~95% ของ traffic). `/` คงเป็น default ลูกค้า, `/business` แยก path.
- ❌ ไม่เพิ่ม token/component ใหม่ใน `globals.css`/`cn.ts` — reuse ของเดิม 100%.

## 3. User stories

- ในฐานะ **ลูกค้า** ฉันเปิดหน้าแรกแล้วอยากเจอร้าน+จองเร็ว ไม่ต้องเลื่อนผ่านโฆษณาชวน
  เปิดร้านที่ไม่เกี่ยวกับฉัน.
- ในฐานะ **เจ้าของร้าน** ที่เพิ่งได้ยินชื่อ Quego ฉันอยากมีหน้าที่บอกชัดว่า "ร้านได้
  อะไร" + สมัครได้จากที่เดียว ไม่ต้องเดาว่าทางเข้าร้านอยู่ไหน.
- ในฐานะ **ทีม growth** ฉันอยากมีลิงก์ `/business` ส่งใน LINE กลุ่มช่าง/ยิงแอด audience
  ร้านได้ตรง ๆ และวัด conversion ฝั่งร้านแยกจากฝั่งลูกค้า.
- ในฐานะ **เจ้าของร้านที่สมัครแล้ว** ฉันอยากกลับเข้าระบบร้านได้จากหน้า `/business`
  (วันนี้ login ร้านซ่อนอยู่ใน footer เท่านั้น).

## 4. Flow & UX (mobile 414 first)

**จุด split persona = ป้ายเล็กใน nav เท่านั้น ไม่บังคับเลือก** — ลูกค้าไหลตรงเข้างานหลัก,
ร้านมี affordance ชัด 2 จุด (nav + footer banner).

### หน้า `/` (ลูกค้า) — ลำดับใหม่ (บนลงล่าง)

1. `LandingNav` (+ ลิงก์ใหม่ "เปิดร้าน" → `/business`).
2. `LandingHero` (คงไว้ — search + LiveQueueMock + category pills + stat ที่แก้แล้ว B5).
3. `#shops` section + `ShopDiscovery` — **ดึงขึ้นใกล้ hero** (ลด `pt`) ให้ร้านแรก
   เข้าใกล้ fold.
4. `ValueProps` → `HowItWorks` → `HomeFAQ` (คงไว้ เป็น "เนื้อหารองสำหรับผู้มาใหม่").
5. **(ใหม่)** Banner บาง 1 บรรทัด: `"เป็นเจ้าของร้าน? เปิดคิวออนไลน์ฟรี →"` →
   `/business` (แทน `<ForShopOwners />` เต็ม section).
6. `LandingFooter` (คงคอลัมน์ "สำหรับร้าน").
7. `CustomerBottomNav` (เฉพาะ logged-in, คงเดิม).

### หน้า `/business` (ร้านค้า) — ใหม่ (บนลงล่าง)

1. `LandingNav` (เวอร์ชันเดียวกัน — wordmark กลับ `/`, มี "เข้าสู่ระบบร้าน" ผ่าน
   `SiteAuthLink` เดิม).
2. **Hero ฝั่งร้าน** (`bg-quego-hero`): badge "สำหรับเจ้าของร้าน" + H1 "เปิดรับคิว
   ออนไลน์ให้ร้านของคุณ" + subcopy (ลดงานรับโทร · ลดคิวหลุด) + **CTA coral "เปิดร้านฟรี"
   → `/shops/register`** + ghost "เข้าสู่ระบบร้าน" → `/shop/login` + `OwnerDashboardMock`
   (ย้ายมาจาก `ForShopOwners`).
3. **PERKS 4 ข้อ** (จาก `ForShopOwners.tsx:7-12`): ใช้ทันทีไม่ต้องรออนุมัติ · ฟรีไม่มี
   ค่าแรกเข้า · ลูกค้าเตือนผ่าน LINE ลดคิวหลุด · จัดการคิว/พนักงาน/บริการ จอเดียว.
4. **"ใช้งานยังไง" 3 ขั้นฝั่งร้าน** (reuse layout `HowItWorks`): สมัคร+ตั้งค่าร้าน →
   รับคิว → เรียกคิว. ใช้ความได้เปรียบ "สมัครเสร็จใช้ได้ทันที" เป็น hook
   (`createShop` ลง `status=approved` — verified `ForShopOwners.tsx:16`).
5. **CTA band ปิดท้าย**: "พร้อมเปิดร้านแล้วใช่ไหม" + [เปิดร้านฟรี].
6. `LandingFooter` (เดิม).

ตัวอย่าง copy:
- Banner ฝั่ง `/`: `เป็นเจ้าของร้าน? เปิดคิวออนไลน์ฟรี สมัครเสร็จใช้ได้ทันที →`
- `/business` H1: `เปิดรับคิวออนไลน์ให้ร้านของคุณ`
- CTA: `เปิดร้านฟรี` · `เข้าสู่ระบบร้าน`

ปฏิบัติตาม convention: ฟอนต์ IBM Plex Sans Thai, ปุ่มผ่าน `buttonClassName`, ไม่มี
native dialog, ไม่เพิ่ม token ใหม่. ป้าย nav "เปิดร้าน" ใช้ `text-primary` low-emphasis.

## 5. Data & services

### มีอยู่แล้ว — ใช้ได้เลย (verified)

| ข้อมูล | แหล่ง | สถานะ |
|---|---|---|
| รายการร้าน + นับร้าน (social proof B5) | `listPublicShopsByCategory()` (`page.tsx:12,63`) — หน้า `/` โหลดอยู่แล้ว, `shopCount`/`categoryCount` คำนวณที่ `page.tsx:74-75` | ✅ มี — reuse บน `/business` ได้ |
| PERKS + OwnerDashboardMock | `ForShopOwners.tsx:7-12, 73-131` | ✅ ย้ายมา reuse |
| Hero/HowItWorks layout + tokens | `LandingHero.tsx`, `HowItWorks.tsx`, `bg-quego-hero`/`bg-quego-panel`/`shadow-luxury` | ✅ reuse |
| Auth entry (login ร้าน) | `SiteAuthLink` (`LandingNav.tsx:2,36`), `/shop/login` | ✅ มี |
| `/business` ไม่ถูก guard | `proxy.ts` guard เฉพาะ `/admin /shop /me /login` — `/business` public อัตโนมัติ (เหมือน `/shops/*`) | ✅ ไม่ต้องแตะ proxy |

### ⚠️ ต้องตัดสิน/เพิ่มเล็กน้อย

| ข้อมูล | ที่ขาด | งาน |
|---|---|---|
| **B5 social proof "ยอดจองสะสม"** | มี `shopCount`/`categoryCount` แต่ **ไม่มี count ยอดจองรวม** สำหรับ proof ที่หนักกว่า | **ตัวเลือก A (เลี่ยง data work):** คง stat เป็น `shopCount`/`categoryCount` แต่เปลี่ยน **เงื่อนไข cold-start**: เมื่อ `shopCount` ต่ำ ใช้ value-statement ("เปิดให้จองทุกวัน · เตือนผ่าน LINE") แทนตัวเลขที่ดูร้าง. **ตัวเลือก B (ถ้าต้องการตัวเลขจริง):** เพิ่ม service นับ `bookings` (เช่น completed ทั้งระบบ) แบบ cache สั้น — flag เป็น data task เล็ก, ไม่ต้อง migration. **เริ่มที่ A.** |

### ไฟล์ที่คาดว่าจะแตะ

- `src/app/business/page.tsx` **(ใหม่)** — หน้า `/business` + `metadata` แยก (ดู §
  metadata ล่าง). `export const dynamic = "force-dynamic"` ถ้าใช้ social proof สด.
- `src/app/page.tsx` — ลบ import + render `<ForShopOwners />` (บรรทัด 7, 141);
  เพิ่ม banner cross-link; ปรับ `pt` ของ `#shops` (บรรทัด 106).
- `src/components/landing/ForShopOwners.tsx` — refactor: แยกชิ้นส่วน (PERKS,
  `OwnerDashboardMock`) ให้ `/business` reuse ได้ (อาจ export ชิ้นย่อย หรือคงทั้ง
  component แล้วเรียกใน `/business`). **เลิก render บน `/`**.
- `src/components/landing/LandingNav.tsx` — เพิ่ม entry "เปิดร้าน" → `/business`
  (เพิ่มใน `ANCHOR_LINKS` ไม่ได้ตรง ๆ เพราะนั่นเป็น hash-anchor desktop-only;
  เพิ่มเป็นลิงก์แยกที่แสดง mobile ด้วย).
- `src/components/landing/LandingHero.tsx` — B5: ปรับ logic `stats` (บรรทัด 56-64).
- `src/components/booking/ShopDiscovery.tsx` — B4: เปลี่ยนปลายทาง `OpenShopCtaCard`
  (บรรทัด 202-225) → `/business` (หรือเอาออก, ดู §9).
- (อาจ) `src/components/landing/HowItWorks.tsx` — ถ้าจะ reuse layout ให้รับ `STEPS`
  เป็น prop; ถ้าไม่ ทำ steps ฝั่งร้าน inline ใน `/business`.

### Authz / ownership

ไม่มี mutation ใหม่. `/business` เป็น static/marketing + social-proof read ผ่าน
`listPublicShopsByCategory()` (public อยู่แล้ว). CTA ชี้ไป flow เดิม
(`/shops/register`, `/shop/login`) ที่มี guard/ownership ของตัวเองครบแล้ว.

## 6. Realtime/LINE

ไม่มี LINE touchpoint ใหม่. ไม่เพิ่ม poll loop. **แต่** copy `/business` ที่เคลม "ฟรี +
เตือนผ่าน LINE" ต้องสอดคล้องกับการออกแบบ LINE แบบ reply-first/คุม push-quota (OPP-02) —
ดู §9 risk. อย่าเคลมเกินกว่าที่ loop จริงทำได้ฟรี.

## 7. Edge cases

- **`/business` เปิดตอนยังไม่มีร้านเลย** → social proof ต้องไม่แสดงตัวเลข 0/"—" ที่ดูแย่
  (ใช้ตัวเลือก A §5: value-statement).
- **ลูกค้า logged-in เปิด `/business`** → ยังเข้าได้ (public); `SiteAuthLink` แสดง state
  ของ session ที่มี — ไม่ต้อง redirect. (เจ้าของร้าน logged-in เห็น "เข้าสู่ระบบร้าน"
  เป็นทางกลับเข้า `/shop`.)
- **`OpenShopCtaCard` ตอนผลค้นหาน้อย** (B4) → ถ้าคงไว้ ต้องชี้ `/business` ไม่ใช่
  register ตรง; ถ้าเอาออก grid ต้องไม่มีช่องโหว่ layout.
- **Deep-link เก่า `/#for-owners`** → `ForShopOwners` ถูกย้าย; anchor นี้จะหาย. ตรวจว่า
  ไม่มีลิงก์ภายใน/QR/แคมเปญที่ชี้ `#for-owners` ค้างอยู่ (footer/อื่น ๆ) → redirect หรือ
  อัปเดตเป็น `/business`.
- **Banner cross-link บน `/`** ต้อง low-emphasis พอที่จะไม่แย่ง core task ลูกค้า แต่
  มองเห็นได้.

## 8. Acceptance criteria

**B1 — `/business`**
- [ ] เข้า `/business` ได้ (public, ไม่ถูก redirect โดย `proxy.ts`).
- [ ] มี hero ฝั่งร้าน + PERKS 4 ข้อ + "ใช้งานยังไง" 3 ขั้น + dual CTA
      ("เปิดร้านฟรี"→`/shops/register`, "เข้าสู่ระบบร้าน"→`/shop/login`) + CTA band.
- [ ] มี `metadata` แยก (title/description/keywords/OG ฝั่งร้าน — ไม่ใช่ copy ลูกค้า).
- [ ] reuse tokens/components เดิม; ไม่มี token ใหม่ใน `globals.css`/`cn.ts`.

**B2 — `/` slim**
- [ ] `<ForShopOwners />` ไม่ render บน `/` อีก; แทนด้วย banner 1 บรรทัด → `/business`.
- [ ] `#shops`/ร้านแรกเข้าใกล้ fold ขึ้นกว่าเดิมบน mobile 414 (วัด scroll-depth ลด).
- [ ] ValueProps/HowItWorks/FAQ ยังอยู่ครบ; หน้าไม่ error.

**B3 — Nav entry**
- [ ] `LandingNav` มีลิงก์ "เปิดร้าน" → `/business` มองเห็นทั้ง desktop + mobile,
      style low-emphasis ไม่แย่ง CTA ลูกค้า.

**B4 — OpenShopCtaCard**
- [ ] ปลายทางชี้ `/business` (หรือถูกเอาออกตามมติ §9); ไม่มีช่องโหว่ layout ใน grid.

**B5 — social proof**
- [ ] หน้า `/` + `/business` ตอน supply ต่ำ **ไม่แสดงตัวเลขที่ดูร้าง/"—"**; ใช้
      value-statement หรือ count จริงที่ > 0 เท่านั้น.

**ทั่วไป**
- [ ] mobile 414 ไม่ล้น/ไม่ตัดบรรทัด ทั้ง `/` และ `/business`.
- [ ] `pnpm lint` + `pnpm build` ผ่าน.
- [ ] ไม่มีลิงก์ค้างที่ชี้ `#for-owners` แบบ dead.

## 9. Risks & open Qs

- **B4 — คง `OpenShopCtaCard` หรือเอาออก?** ux-ui เสนอ *เอาออก* (CTA ผิด persona ใน
  ผลค้นหา); product เสนอ *คงไว้แต่ชี้ `/business`* (คนค้นไม่เจอร้าน = อาจเป็นเจ้าของร้าน
  พอดี, contextual). **เสนอ: คงไว้ + repoint `/business` + แสดงเป็น filler เฉพาะตอนผล
  น้อยเท่านั้น (พฤติกรรมเดิม).** ตัดสินก่อนเริ่ม.
- **เงื่อนไข "ฟรี + เตือน LINE" (OPP-02):** ก่อน `/business` เคลม ต้องมั่นใจว่า LINE loop
  อยู่ใต้โควต้าฟรี (reply-first; push metered ต่อผู้รับ). ถ้า loop ใช้ push เผาโควต้า →
  คำว่า "ฟรี" เป็นเท็จและ positioning พัง. ประสาน OPP-02.
- **Social proof ตัวเลข vs value-statement:** เริ่มที่ value-statement (เลี่ยง data
  work + ไม่ดูร้างตอน cold start); อัปเป็น count จริงเมื่อ supply โต. ยืนยันก่อนเขียน.
- **HowItWorks reuse:** ตรวจว่า `HowItWorks` รับ `STEPS` เป็น prop ได้ไหม ก่อนแก้ — ถ้า
  เสี่ยงกระทบหน้า `/` ให้ทำ steps ฝั่งร้าน inline ใน `/business` แทน.
- **เอกสารตามโค้ดไม่ทัน:** competitive brief เก่าอ้าง `/me/credit` แต่ route จริงคือ
  `/me/rewards` (verified). เช็ก path ก่อนเขียน copy ที่ลิงก์ไปหน้านั้น.

## 10. Handoff

- **ขนาดรวม:** **M** — UI/route assembly เป็นหลัก, reuse component เดิมเกือบทั้งหมด,
  ไม่มี migration, ไม่มี LINE/infra ใหม่, ไม่มี mutation ใหม่.
- **แยกย่อย (ทำตามลำดับได้):**
  - **B3 + B4** = **S** quick win — เพิ่ม nav entry + repoint CtaCard (ทำได้วันนี้
    แม้ยังไม่มี `/business`: ชี้ `#for-owners` ไปก่อนแล้วค่อยเปลี่ยน).
  - **B1** = M — สร้าง `/business` + refactor `ForShopOwners` ให้ reuse ได้.
  - **B2** = S — ลบ section ออกจาก `/` + banner + ปรับ `pt`.
  - **B5** = S — แก้ stat logic.
- **Implementing agent:** `nextjs-developer` / `feature-dev` (solo) — ไฟล์ disjoint,
  logic ตรงไปตรงมา. ปฏิบัติตาม `frontend-dev` skill (ฟอนต์ Thai, ปุ่มผ่าน
  `buttonClassName`, ไม่มี native dialog).
- **คู่ขนาน:** ux-ui-designer ดู treatment banner cross-link + hero `/business` +
  social-proof copy ก่อน build.
- **Related (แยก PRD):** OPP-23 (referral UI ใน `/me` — surface OPP-15), OPP-24
  (post-register activation checklist). ทั้งคู่ ROI สูง แนะนำทำต่อจาก OPP-22.

### Metadata ที่เสนอสำหรับ `/business`

```
title: "Quego สำหรับร้าน — เปิดรับจองคิวออนไลน์ ฟรี ใช้ทันที"
description: "ระบบจัดการคิว/รับจองออนไลน์สำหรับร้านความงามและสุขภาพ
  สมัครฟรี ใช้ได้ทันที ลดงานรับโทร ลดคิวหลุด เตือนลูกค้าผ่าน LINE"
keywords: ["ระบบจองคิวร้าน", "เปิดร้านรับจองคิว", "โปรแกรมจัดการคิว",
  "ระบบจองคิวร้านเสริมสวย", "รับจองออนไลน์ฟรี", "ระบบคิวร้านตัดผม"]
openGraph: { type: "website", locale: "th_TH", siteName: "Quego",
  url: `${SITE_URL}/business` }
```
