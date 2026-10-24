# Quego — Product Gap & Opportunity Review (ฉบับ 2026-10-24)

> ต่อยอดจาก [competitive-analysis-2026-07-26.md](competitive-analysis-2026-07-26.md) และ
> [gtm-competitive-review-2026-07-26.md](../marketing/gtm-competitive-review-2026-07-26.md)
> โดยไม่เขียนซ้ำ — เอกสารนี้ตอบ 5 คำถาม: (1) วันนี้เรามีอะไรจริง ขาดอะไรจริง
> (2) คู่แข่งขยับอะไรใน 3 เดือน (3) เทรนด์อุตสาหกรรมอะไรใช้ได้กับเรา (4) เจ้าของร้าน
> และลูกค้าเจ็บตรงไหนจริง ๆ (5) ควรสร้างอะไร เรียงลำดับอย่างไร จึงจะชนะและใช้งานง่าย
>
> ที่มาข้อมูล: audit โค้ดใน `src/` + `supabase/migrations/` (ยืนยันทุกข้อ) · วิจัยเว็บ 3 สาย
> (คู่แข่งไทย, เทรนด์โลก, เสียงเจ้าของร้าน) เข้าถึง 2026-10-24 ทั้งหมด · สัญลักษณ์
> **[FACT]** = ยืนยันจากต้นทาง · **[ไม่ยืนยัน]** = แหล่งเดียว / vendor เอง · **[CODE]** = ยืนยันในโค้ดเรา

---

## 0. TL;DR — 8 ประโยค

1. **ตั้งแต่ ก.ค. ทีมทำงานไป 53 commit แต่เป็น security hardening ~40 รายการ** (ดีมาก แต่ฝั่งผลิตภัณฑ์ขยับแค่ 3 เรื่อง: แก้ copy ให้ตรงของจริง, activation checklist, guided tour) → **P0 ของ brief ก.ค. ยังเปิดอยู่ 6/8 ข้อ** [CODE]
2. **ตลาด low-end ไทยกลายเป็น "ฟรีถาวร" แล้ว** — MeQueue, BookQ, QueueBooking, QueueD, NudNow ล้วนมีแพ็กฟรี และราคาจ่ายลดลง (QueueBooking Pro 1,490→990) → "ฟรี" ไม่ใช่จุดขาย **แต่คู่แข่งทุกรายผลักค่าข้อความ LINE ให้ร้านจ่ายเองผ่าน OA ของร้าน** ซึ่งเรารับไว้เอง — นี่คือข้อต่างที่ยังไม่มีใครพูดตาม [FACT]
3. **LINE ยังไม่ลงมาทำ booking/queue เอง** (ประกาศ ส.ค. 2026 = MyShop/MyTeam/Verified badge/MINI Eats ร้านอาหาร) → ความเสี่ยง existential ของ brief ก.ค. ยังไม่เกิด แต่ต้องเฝ้าต่อ [FACT]
4. **"Live queue ที่ลูกค้าเปิดดูเองได้" ยังเป็นของหายากในไทย** — BeTask เป็น push ที่พนักงานกด, มีแค่ Q Natural (ฮาร์ดแวร์ราคา enterprise) ที่ทำสถานะสด → เสาหลักของเรายังยืนอยู่ [FACT]
5. **เสียงเจ้าของร้านชี้ชัด: ความเจ็บอันดับ 1 คือ "จองแล้วไม่มา / มาสายมาก" และเขาคิดเป็น "เสียรายได้ครึ่งวัน"** (ร้านเล็บ/ขนตากันเวลา 1.5–3 ชม./คิว) ส่วนลูกค้าเจ็บเรื่อง "จองแล้วยังรอ 2–3 ชม." และ "ร้านอ่านไม่ตอบ" → ทั้งสองฝั่งต้องการ **ความจริงเรื่องเวลาแบบเรียลไทม์ + การเตือน** ซึ่งเรามีครึ่งเดียว (pull มี, push reminder ไม่มี) [FACT][CODE]
6. **เทรนด์โลก 2026 ที่ตรงกับเรา**: chat-first booking, any-staff = เร็วสุด + ย้ายช่างอัตโนมัติ (Fresha), waitlist เติมช่องว่าง, hybrid walk-in + นัดหมาย, web app แข็งขึ้นบน iOS 26, rebook loop (rebook ≥2 ครั้ง cancel แค่ 4%) — **เรามีโครงของทั้ง 6 เรื่องแล้ว** ขาดการต่อยอดให้ครบวง [FACT][CODE]
7. **ของใหม่ที่ต้องรับมือ**: PDPA access-request rule มีผล 14 ก.ย. 2026 (ตอบใน 30 วัน, สำเนาอิเล็กทรอนิกส์ฟรี) — เรายังไม่มี export ข้อมูลทั้งฝั่งร้านและลูกค้า · Meta Business AI ฟรีบน Messenger เปิดไทยแล้ว · LIFF < v2.31.1 จะถูกบล็อก ~24 พ.ย. 2026 (กระทบคู่แข่งที่ใช้ LIFF ทุกราย ไม่กระทบเรา) [FACT]
8. **ข้อเสนอ 90 วัน**: ปิดหนี้ 6 ข้อที่ค้าง (reminder, no_show, SEO, export, checklist LINE+first-booking, rich-menu/GBP playbook) ภายใน 6 สัปดาห์ → แล้วเดิมพัน 3 เรื่องที่ไม่มีใครในไทยทำ: **(ก) "ความจริงเรื่องเวลา" สองทาง (ร้านช้า/ลูกค้าสาย) (ข) ความน่าเชื่อถือลูกค้าต่อเบอร์ + มัดจำแบบมีเงื่อนไขไม่ต้องมี payment gateway (ค) ลูกค้าประจำ/ช่างประจำเป็นของจริง**

---

## 1. ส่วนที่ 1 — สถานะจริงวันนี้ (verified ใน `src/`)

### 1.1 ขยับอะไรตั้งแต่ brief ก.ค. 2026 [CODE]

| เรื่อง | สถานะ | หลักฐาน |
|---|---|---|
| A2 แก้ copy ให้ตรงของจริง | ✅ ปิดแล้ว | `8f4e829 fix(copy): promise only what the product actually does` — `ValueProps.tsx` เหลือ "ดูคิวเรียลไทม์ / เลื่อน–ยกเลิกเองได้ / ไม่ต้องโหลดแอป"; `BusinessValueProps.tsx` เหลือ "รู้ทุกการจองทาง LINE" |
| A3 activation checklist | ⚠️ ทำครึ่ง | `561cf7d` — 5 ขั้น (บริการ, เวลาเปิด, หมุด, โลโก้, พนักงาน) ใน `lib/shop/setup-checklist.ts` **แต่ไม่มี "เชื่อม LINE" และ "จองจริงครั้งแรก"** ที่ brief ก.ค. ระบุเป็น north-star |
| Guided tour | ✅ ใหม่ | `40d3a62` `lib/tour/` |
| Security audit (PR #56–#74) | ✅ ~40 รายการ | CSP, session revoke, kiosk token, audit append-only, rate-limit, OTP freshness, pg_cron retention ฯลฯ |
| Insights rollup ใน SQL | ✅ | `20261028000000_shop_insights_rollup.sql` |
| A1 reminder ก่อนถึงคิว | ❌ **ยังไม่มี** | `rg -i remind src/lib/services` พบแค่ comment; ไม่มี `vercel.json`/route handler ตามเวลา; มี `pg_cron` แล้วแต่ใช้แค่ retention |
| A7 สถานะ `no_show` | ❌ | enum ยังเป็น `confirmed/cancelled/completed` (`baseline_schema.sql:42`) |
| A8 SEO primitives | ❌ | ไม่มี `sitemap.ts`, `robots.ts`, JSON-LD, `metadataBase` (grep = 0) |
| A4 rich-menu deep link / A6 GBP playbook | ❌ | `/shop/share` มี QR + ลิงก์ แต่ไม่มี playbook/ภาพ rich menu |
| A5 ล้าง BACKLOG | ❌ | `BACKLOG.md` ยังมี OPP-15/OPP-23 (loyalty/referral ที่ลบไปแล้ว) ในตาราง NOW |
| B6 export ข้อมูลลูกค้า | ❌ | `download` ฝั่งร้านมีแค่ QR PNG |
| B2 soonest-slot ใน discovery | ⚠️ | ใน `BookingForm.tsx:270` มี "พนักงานคนไหนก็ได้ = เร็วกว่า" แล้ว แต่หน้า discovery ยังไม่เรียง "ว่างเร็วสุด" |
| B3 VIP | ❌ | ยังเป็น design token เท่านั้น |
| B1 LIFF | ❌ | ยังไม่มี (และดูข้อ 2.1 — เงื่อนไข LINE เปลี่ยน) |

### 1.2 ของที่มีจริงและแข็ง (สินทรัพย์ที่ต่อยอดได้) [CODE]

- **Booking engine**: slot-math ใช้ร่วม client/server, GiST overlap 2 ชั้น, auto-assign ช่างว่าง + retry เมื่อแพ้ race, cutoff เลื่อน/ยกเลิกต่อร้าน, ร้านจองแทนลูกค้า, walk-in QR เข้าคิวที่ช่องว่างเร็วสุดวันนี้ (`createWalkInBooking`) — **walk-in กับนัดหมายอยู่ใน `bookings` ตารางเดียวกันอยู่แล้ว = hybrid board โดยธรรมชาติ**
- **Live queue ต่อเลนช่าง** (`queue-position.ts`) + now-serving display ที่ปิดบังชื่อ (`maskCustomerName`) + polling 10/20 วิ
- **LINE loop**: push ยืนยัน/ยกเลิก/เลื่อน/ลูกค้ามาถึง/waitlist slot open · reply-postback "กำลังมา / เลื่อน / ยกเลิก" · group bind สำหรับร้าน · log + dedupe · **ร้านไม่ต้องมี OA**
- **Waitlist** + เสนอคิวว่างผ่าน LINE + claim 15 นาที (event-driven ไม่ต้องมี cron)
- **CRM ตามเบอร์**: `shop_customer_summary` view (visits, lifetime spend, last visit) + โน้ตส่วนตัวต่อร้าน + ประวัติข้ามการจอง
- **Insights + expenses → กำไรสุทธิ** (รายเดียวในตลาดที่ matrix ก.ค. ให้เขียว)
- **Near-me**: pin, Haversine, นำทาง · Discovery: หมวด/จังหวัด/อำเภอ/ตำบล/เปิดอยู่
- **Activation + tour + presets** ลดเวลาตั้งร้าน
- **Security posture** ระดับที่คู่แข่ง micro-SaaS ไทยไม่มีใครโฆษณาได้ (CSP, append-only audit, session versioning, kiosk token แยก)

### 1.3 ช่องว่างเชิงเทคนิคที่ audit รอบนี้พบเพิ่ม (ไม่อยู่ใน brief ก.ค.) [CODE]

| ช่องว่าง | ทำไมสำคัญ | หลักฐาน |
|---|---|---|
| **เวลาเปิดข้ามเที่ยงคืนไม่ได้** | ร้านตัดผม "รอบดึกถึงตี 2", ร้านเล็บ 24 ชม./คิวสุดท้าย 21:30 มีจริงในตลาด (ข้อ 4) | `slot-math.ts:117` `if (open >= close) return []` |
| **ช่างไม่มีตารางงาน/วันหยุด/เวลาพัก** | ช่างลา 1 วัน = ร้านต้องปิดช่างด้วย `is_active` ทั้งคน; ลูกค้าจองช่างที่ไม่อยู่ได้ | `shop_staff` มีแค่ `is_active`, ไม่มี schedule/day_off |
| **ไม่มี buffer เวลาเตรียม/เก็บ** ต่อบริการ | Fresha เพิ่งขายเป็นฟีเจอร์ 2026; เล็บ/ขนตา/สปาต้องการ 10–15 นาที | `shop_services` มีแค่ `duration_minutes` |
| **ไม่มี manifest / web push / add-to-calendar** | iOS 26 เปิดทุกเว็บที่ Add to Home Screen เป็น web app ดีฟอลต์; เป็น fallback ของ LINE ที่ฟรี | grep `manifest|pushManager|text/calendar` = 0 |
| **ไม่มี analytics พฤติกรรมผู้ใช้ของเราเอง** | วัด conversion funnel จอง (เป้า <60 วิ) ไม่ได้เลย | grep `posthog|@vercel/analytics|umami` = 0 |
| **ไม่มี staff view** | ช่างดู "คิวของฉัน" ไม่ได้ ต้องถามเจ้าของ; ร้าน 3–5 ช่างใช้ร้านละ 1 login | มีแค่ owner session + display token |
| **PDPA access-request** | กฎใหม่มีผล 14 ก.ย. 2026 — ไม่มีทั้ง export ฝั่งร้านและ "ดาวน์โหลดข้อมูลของฉัน" ฝั่งลูกค้า | ข้อ 1.1 B6 |
| **ประเภทบริการที่ `duration % 10 = 0` และ ≥10 นาที** | โอเคสำหรับความงาม; ถ้าขยาย vertical (คลินิก/อู่) จะชน | `shop_services_duration_minutes_check` |

---

## 2. ส่วนที่ 2 — คู่แข่ง: อะไรเปลี่ยนใน 3 เดือน

### 2.1 LINE — ยังไม่ลงมาเล่น แต่กติกาเปลี่ยน [FACT]

- **ไม่มี first-party booking/queue/beauty** ใน LINE Thailand Business Insight 2026 (ส.ค.) — มีแต่ MyShop "Chat Commerce Engine", **MyTeam** (จัดการแอดมิน OA, ต้นปี 2027), Verified OA badge, MINI Eats (ลดโปรเหลือ **990 บาท/เดือน** ถึง 31 มี.ค. 2027, ร้านอาหารเท่านั้น)
- LINE OA "AI Mode" ยัง Japan-only · ราคา OA ไทยคงเดิม (Free 300 / Basic 1,280 / Pro 1,780) · OA Chat Package 555 บาท มี AI Chatbot (Beta) ตอบ Q&A เท่านั้น
- **MINI App ไทย**: self-publish *Unverified* ได้เองตั้งแต่ 11 มี.ค. 2026 (แอป ×3 เป็น >1,000, DAU ×4) **แต่ Unverified ไม่ได้ Service Message, ไม่ขึ้น search**; Verified ต้องผ่าน certified provider; Service Message ฟรีแต่ส่งได้แค่ยืนยันสิ่งที่ผู้ใช้ทำ และไปโผล่ห้อง "LINE MINI App Notice" ไม่ใช่ OA ร้าน
- **LIFF v2.20–2.31.0 ถูกจำกัด ~24 พ.ย. 2026** · เก็บ service fee IAP ใน MINI App ตั้งแต่ 1 ก.ค. 2026
- **ผลต่อเรา**: (1) LIFF/MINI App ยิ่งไม่ควรเป็นเดิมพันหลัก — ทางที่คุ้มคือ Unverified MINI App เป็น "ทางเข้า" เท่านั้น ส่วน notification ยังต้องเป็น Messaging API push ของเรา (2) MyTeam ปี 2027 จะทำให้ "แชทล้น" ของร้านดีขึ้นโดย LINE เอง → ข้อเสนอด้าน inbox ของเราไม่ควรแข่งตรง

### 2.2 Meta [FACT]

- **Meta Business AI เปิดในไทย 11 มี.ค. 2026** (ไทย+ฟิลิปปินส์เป็น 2 ประเทศแรกของโลก), Messenger เท่านั้น, ฟรีช่วงเปิดตัว, Meta ระบุกลุ่มเป้าหมาย "บิวตี้ คลินิกความงาม" **ยังไม่มีการจองนัดในเวอร์ชันไทย**
- Meta Business Agent (จองนัดผ่านปฏิทิน) เปิด global 3 มิ.ย. 2026 บน WhatsApp/IG, จะอยู่ใน WhatsApp Business Premium, สถานะไทย [ไม่ยืนยัน]
- **ผลต่อเรา**: "AI ตอบแชท" ถูกกดราคาเป็น 0 — ไม่ควรสร้าง AI chatbot ทั่วไป; แต่ "AI ที่จองได้จริงในไทย" ยังแพง (Bookio 8,600/เดือน, ZERVA 28,500/ปี) → ช่องว่าง "bot ตอบคิว/ความว่างจาก inventory จริง" ที่เราทำได้ด้วย Reply API ฟรี

### 2.3 คู่แข่งตรงไทย — ตารางราคา/ฟีเจอร์ ณ 2026-10-24 [FACT เว้นแต่ระบุ]

| ราย | ราคา | สิ่งที่มี | สิ่งที่ไม่มี |
|---|---|---|---|
| **MeQueue** | Free (300 จอง/เดือน, 2 ช่าง) · 189 · 399 · 539 | LIFF ใน OA ร้าน, เตือน 1 วัน + 2 ชม., มัดจำ, member/points, **ประกาศ AI Receptionist + Smart Fill Waitlist + Google Calendar sync** (ไม่มีวันเปิด), ทำ SEO content ถี่มาก | live queue, now-serving display |
| **BookQ** | ฟรีตลอดชีพ 2 ช่าง | มัดจำ, เตือน LINE | live queue, paid tier |
| **QueueBooking** | Free 50 คิว/เดือน · Pro **990** (เดิม 1,490) · Business **2,490** (เดิม 3,990) | LIFF, Queue Board real-time, มัดจำ PromptPay QR **+ Bank App deep-link ยอดล็อก (ใหม่)** | ร้านจ่ายค่าข้อความ LINE เอง |
| **QueueD** (ใหม่, เน้นร้านตัดผม) | Free 1 ช่าง 60 คิว · 199 · 690 · 1,490; สาขา +300–500 | แจ้งเตือนผ่าน OA ร้าน, **นับ no-show** | live queue |
| **NudNow** (ใหม่ 2026) | Free 30 คิว · 499 · 999 · 1,999 | เตือน LINE (แพ็ก 999+) | live queue, มัดจำ [ไม่ยืนยัน] |
| **Bookio** (ใหม่, LINE+Google) | 4,300 · 8,500 · **AI Agent "Mali" 8,600/เดือน** | ปุ่มจองบน GBP, Meta Lead Ads, เตือน 24 ชม./1 ชม. | ราคาสำหรับร้าน 1–5 ช่าง |
| **BeTask** | 999 / 2,999 / 4,999 (ไม่เปลี่ยน) | rich menu, มัดจำ QR + สลิป, loyalty; "บอกคิวที่เหลือ" = **push ที่พนักงานกด** ไม่ใช่หน้าสด | หน้าสถานะคิวที่ลูกค้าเปิดเอง [ไม่ยืนยัน]; เว็บ © 2022 |
| **FoxConnect** | 690 / 1,590 / 2,990 (ขั้นต่ำ 3 เดือน) | booking + CRM + unified inbox | queue, มัดจำ, AI, free trial |
| **ZERVA** | รายปี 28,500–35,000 | chatbot + จอง | free tier |
| **Loga** | Free (100 สมาชิก) · 490–3,290 | booking ทุกแพ็ก | LINE OA เฉพาะ Gold+ หรือ add-on 26,750 |
| **Q Natural** | ฮาร์ดแวร์ 1,000+ / cloud 30,000 | **สถานะคิวสด "เหลืออีกกี่คิว" + รวม walk-in กับจองในลำดับเดียว** | ราคาสำหรับร้านเล็ก |
| **GoWabi** | ฟรี + คอมมิชชัน (ไม่เปิดเผย %) | >10,000 ร้าน, >1M ผู้ใช้, >3M การจอง, POS (รายปี), OR ลงทุน 145 ล้าน | widget, LINE; มีรีวิว Trustpilot ว่าใส่ปุ่มจองบน GBP ของร้านแล้วเก็บคอมจากลูกค้าเดิม [ไม่ยืนยัน] |
| **Fresha TH** | Independent 525 · Team 350/คน; SMS 1.50; new-client fee | AI Intelligent Scheduling, AI Concierge, Reputation Manager (global) | LINE |
| **QueQ** | ติดต่อฝ่ายขาย | ร้านอาหาร/ธนาคาร/รพ., 2 กม. | salon, LINE; เว็บ © 2019 |
| **LINE MAN Wongnai × JERA Cloud** | — | ซื้อ POS คลินิก/สปา 1,700 สาขา (~1/3 GMV บิวตี้ไทย) ส.ค. 2025 | ยังไม่มี product จอง salon เปิดจริง |

**อ่านตาราง 4 ข้อ**
1. "ฟรี" = ราคาตลาด; ราคาจ่ายกำลัง **ลง** ไม่ใช่ขึ้น → anchor ราคาในอนาคตของเราควร ≤ 499 สำหรับ tier แรก
2. **ทุกรายใช้ OA ของร้าน** → ร้านต้องมี OA + จ่ายโควตาข้อความเอง (QueueD ยอมรับเองว่า "ถ้าเกินโควตาฟรี ร้านซื้อแพ็กเกจ LINE") — **เราคือรายเดียวที่ร้านไม่ต้องมี OA และไม่จ่ายค่าข้อความ** — ยังเป็นข้อต่างเชิงโครงสร้าง
3. ไม่มีใครมี **live queue + waitlist + now-serving + กำไรสุทธิ** พร้อมกัน (เหมือน ก.ค.)
4. คู่แข่งเริ่ม **นับ no-show** (QueueD) และทำ **มัดจำแบบ deep-link ธนาคาร** (QueueBooking) — เราไม่มีทั้งสอง

### 2.4 กฎหมาย/การเงินที่มีผลแล้ว [FACT]

- **PDPA ประกาศ กคส. เรื่องการเข้าถึง/ขอสำเนาข้อมูล** มีผล **14 ก.ย. 2026**: ตอบคำขอใน 30 วัน, ให้สำเนาอิเล็กทรอนิกส์ฟรี, เก็บบันทึกคำขอ ≥2 ปี, **ไม่มีข้อยกเว้น SME** — เราเก็บเบอร์โทร/ประวัติจองแทนร้านหลายร้าน = ต้องมีเครื่องมือ
- ธปท. มาตรฐานค่าบริการ 19 รายการ (ก.ค.–ต.ค. 2026) ไม่กระทบ PromptPay MDR · **ไม่มี API มัดจำ PromptPay แบบ open** → vendor ใช้ QR static + สลิป หรือ deep-link ธนาคาร
- Easy e-Receipt 2569 สะดุด (รัฐบาลรักษาการ)

---

## 3. ส่วนที่ 3 — เทรนด์อุตสาหกรรม 2025–2026 ที่ใช้กับเราได้

| # | เทรนด์ | หลักฐาน | เรามีอะไรแล้ว | ต่อยอดอย่างไร |
|---|---|---|---|---|
| T1 | **Chat-first booking** | Meta Business Agent global, Booksy ใน ChatGPT (19 ต.ค. 2026), LINE OA ไทย 12,000 ล้านบทสนทนา/ปี, >90% แชทใหม่ไม่มี follow-up [FACT] | Messaging API push + postback | bot ตอบ "ว่างไหม/อีกกี่คิว" จาก inventory จริงด้วย Reply API (ฟรี) |
| T2 | **Reminder + confirm ลด no-show** | Cochrane CD007458 [FACT]; vendor: reminder ลด 20–30%, 68% ของ no-show เกิดใน 24 ชม. [ไม่ยืนยัน] | flex builder, client, log, ปุ่ม "กำลังมา" | ขาดแค่ตัวสั่งตามเวลา (pg_cron มีแล้ว!) |
| T3 | **Any-staff = เร็วสุด + ย้ายช่างอัตโนมัติ** | Fresha Dynamic Reassignment พ.ค. 2026 [FACT] | auto-assign + "คนไหนก็ได้เร็วกว่า" ใน BookingForm | ให้ booking แบบ noassign ย้ายช่างได้เมื่อช่างที่ลูกค้าเลือกเต็ม/ลา; เรียง discovery ตาม "ว่างเร็วสุด" |
| T4 | **Waitlist เติมช่องว่าง** | Square เปิดที่ Appointments; Acuity gate ไว้แพลนจ่าย; Waitwhile ล็อก sync ที่ $55 [FACT] | มีฟรี, event-driven | เพิ่ม "เสนอก่อนให้ลูกค้าประจำ" + บอกร้านว่าช่องว่างนี้มีคนรอ |
| T5 | **Hybrid walk-in + นัดหมาย** | buyer's guide 2026 ให้คะแนนสูงกว่า queue-only; Q Natural ไทยทำ [FACT/vendor] | ตารางเดียวกันอยู่แล้ว | โชว์ให้ร้านเห็น "ลำดับรวม" ชัด ๆ + ETA |
| T6 | **Web app แข็งขึ้น ไม่ต้องมีแอป** | iOS 26 เปิดทุกเว็บที่ Add to Home Screen เป็น web app, Declarative Web Push ตั้งแต่ Safari 18.4, passkey-ready 95% [FACT] | ไม่มี manifest/push | manifest + push เป็น fallback ฟรีของ LINE; passkey แทน PIN ในอนาคต |
| T7 | **Rebook loop = retention** | Zenoti: rebook ครั้งแรก cancel 72%, ≥2 ครั้ง 4%; ลูกค้าใหม่ no-show 2–3x [ไม่ยืนยัน] | "จองอีกครั้ง" ใน `/me/bookings`, CRM ตามเบอร์ | rebook ตอน completed + จำช่างเดิม + nudge ตามรอบ |
| T8 | **แรงต้าน commission ในไทย** | กขค. freeze ค่าคอม 6 เดือน (7 ก.ย. 2026); LINE TH: SME หนีค่าธรรมเนียม [FACT] | ฟรีไม่มีคอม | พูดให้ชัด "ไม่เก็บคอมมิชชันจากลูกค้าของคุณ" |
| T9 | **AI receptionist = premium ของรายใหญ่** | $99–399/เดือน; salon เป็นแค่ 5.4% ของผู้ใช้ [ไม่ยืนยัน] | — | **ยังไม่ทำ**; ทำ AI ราคาถูกแทน: ร่างคำตอบรีวิว, สรุปลูกค้าจากโน้ต |
| T10 | **AI search discovery / Reserve with Google** | Google AI Mode agentic booking (US), RwG partners 20→500 ใน LSA (ส.ค. 2026), Apple Business Connect action link [FACT]; ไทยยัง [ไม่ยืนยัน] | — | SEO primitives + ลิงก์จองบน GBP/Apple Maps ก่อน; RwG เมื่อยืนยันไทย |
| T11 | **Review automation** | Fresha Reputation Manager ส.ค. 2026 [FACT] | reviews เฉพาะ completed | ขอรีวิวหลังเสร็จ + ร่างคำตอบให้ร้าน |
| T12 | **Memberships/packages** | full-service salon +36% YoY; GlossGenius เพิ่ม [ไม่ยืนยัน] | — | "แพ็กเกจนับครั้ง" ที่ร้านบันทึกเอง ไม่ต้องมี payment (OPP-20 รุ่นเบา) |
| T13 | **Resource scheduling + buffer** | Fresha พ.ค. 2026 [FACT] | ไม่มี | buffer ต่อบริการก่อน; ห้อง/เตียงเมื่อมี demand สปา |

---

## 4. ส่วนที่ 4 — เสียงเจ้าของร้านและลูกค้า → สิ่งที่ต้องสร้าง

### 4.1 10 insight (จากคำพูดจริง มีแหล่งอ้างอิงใน §9) → ผลต่อผลิตภัณฑ์

| # | Insight [FACT เว้นแต่ระบุ] | ผลต่อสิ่งที่สร้าง |
|---|---|---|
| I1 | ปัญหาอันดับ 1 = "จองแล้วไม่มา/มาสายมาก" คิดเป็น "เสียรายได้" (ร้านเล็บ/ขนตากัน 1.5–3 ชม./คิว) — ทนายแนะมัดจำ, ร้านรอ 57 นาทีแล้วยังคืนมัดจำ 200 เพราะกลัวเสียชื่อ | reminder ต้องมี **และ** ต้องมีตัวชี้วัด (no_show) · มัดจำต้อง "มีกฎกลาง" มากกว่า "มีเงิน" |
| I2 | มัดจำ 100–300 บาทเป็นบรรทัดฐานร้านเล็บ/ขนตา แต่เก็บผ่าน QR + สลิปด้วยมือ; ข้อพิพาท 2 ทาง | **มัดจำแบบบันทึก + กฎชัด** ทำได้โดยไม่มี payment gateway: ร้านแปะ QR, ลูกค้าอัปสลิป, ร้านกดยืนยัน; เงื่อนไขคืน/ริบแสดงก่อนจอง |
| I3 | "15 นาที" คือเกณฑ์สายที่สองฝั่งใช้ และ **ย้อนกลับได้** — ลูกค้าทวงมัดจำเมื่อร้านสาย 20 นาที | **"ร้านช้า X นาที" ปุ่มเดียวฝั่งร้าน** + "สายนิดนึง" ฝั่งลูกค้า = ความจริงเรื่องเวลาสองทาง |
| I4 | ร้านจริงใช้กฎ "ครั้งแรกไม่มัดจำ ถ้าเทคิวครั้งหน้าเก็บ 100" เองอยู่แล้ว | **ความน่าเชื่อถือต่อเบอร์** (มา/เท/ยกเลิกสาย) → shop ตั้ง "เก็บมัดจำเฉพาะลูกค้าใหม่/เคยเท" |
| I5 | "ลูกค้าประจำ" ลัดกฎได้โดยพฤตินัย ร้านพูดตรง ๆ | VIP ต้องเป็นของจริง: tag ต่อเบอร์, waitlist first-refusal, กันช่องให้, ไม่ใช่ token สี |
| I6 | คำว่า "คิว" คลุม 3 ความหมาย; เจ้าของร้านใช้ "จองคิว" กับนัดหมาย | **อย่าบังคับแยก จอง/คิว** ใน UI; ใช้ "จองคิว" เป็นคำหลัก, "คิวตอนนี้" สำหรับลำดับสด |
| I7 | ลูกค้าเจ็บเรื่อง "จองแล้วยังรอ 2–3 ชม." และ "คิวไม่ว่างก็ควรบอก" | ETA บนหน้าสด + แจ้ง "ร้านช้า" **สำคัญกว่า** ใบยืนยันสวย ๆ |
| I8 | แชทคือคอขวด: ลูกค้าทักครั้งที่ 5 "อ่านไม่ตอบ"; แอดมินเล็บทำ 5 งานพร้อมกัน; LINE: 90% แชทใหม่ไม่มี follow-up | **bot ตอบ "ว่างไหม"** จาก inventory จริง (Reply ฟรี) + ลิงก์จอง = ลดงานแอดมินที่วัดได้ |
| I9 | ร้านบุคคลธรรมดา ~120,000 ร้าน (+นวด 16,600) กำไร ~19,000/เดือนตามคำช่าง; ค่าแรง 400; ตลาดโต ~1% | **ทุก 199–999 บาท/เดือนถูกชั่งกับกำไรก้อนนี้** → ฟรี + ไม่จ่ายค่าข้อความคือเรื่องที่ต้องพูดเป็นตัวเงิน |
| I10 | ช่างคนเดิมคือสินทรัพย์ที่ลูกค้าตามไป (ลาออกแล้ว "ใจหาย"; ร้านนวดกลัว "ชวนคนไป") | **"ช่างประจำของคุณ"** จำใน rebook; staff view "คิวของฉัน"; ข้อมูลลูกค้าเป็นของร้าน (export ได้) |

### 4.2 ของที่ตลาดบอกว่ามีจริงแต่เรายังรองรับไม่ได้ [FACT]

- **เวลากลางคืน**: ตัดผมถึงตี 2, ร้านเล็บ 24 ชม. → ต้องรองรับ `close < open` (ข้ามวัน)
- **ร้านไพรเวทรับทีละ 1 คิว** เป็นจุดขาย → ต้องมี "capacity = 1" ชัดเจน (มีอยู่โดยนัยเมื่อไม่มีช่าง — ควรเป็น option ที่ตั้งชื่อได้)
- **ลูกค้าหญิงขอช่างหญิง / สปาสำหรับผู้หญิง** → attribute เพศช่าง (optional, ร้านตั้งเอง) + ลูกค้าเลือกได้
- **ราคาที่ไม่ชัดก่อนมา** เป็นเรื่องร้องเรียนซ้ำ → ราคา + ระยะเวลา + "ราคาอาจเพิ่มตามสภาพผม" บนหน้าจอง และในข้อความยืนยัน

---

## 5. Feature matrix (อัปเดต ต.ค. 2026)

✅ มี/แข็ง · ⚠️ บางส่วน · ❌ ไม่มี · **ตัวหนา** = แกนที่ตลาดตัดสิน

| ความสามารถ | **Quego** | MeQueue | QueueBooking | QueueD | BeTask | GoWabi | Fresha |
|---|---|---|---|---|---|---|---|
| จองออนไลน์ต่อบริการ/ช่าง | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Live queue ที่ลูกค้าเปิดดูเอง** | ✅ ต่อเลนช่าง | ❌ | ⚠️ board | ❌ | ⚠️ push | ❌ | ❌ |
| **ร้านไม่ต้องมี LINE OA / ไม่จ่ายค่าข้อความ** | ✅ **รายเดียว** | ❌ | ❌ | ❌ | ❌ | n/a | n/a |
| **Reminder ก่อนถึงคิว** | ❌ | ✅ 1 วัน+2 ชม. | ✅ | ✅ | ✅ | ⚠️ | ✅ SMS |
| LINE two-way (กำลังมา/เลื่อน/ยกเลิก) | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| Waitlist + เสนอคิวว่าง | ✅ | ⚠️ ประกาศ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| Walk-in QR + รวมลำดับกับนัด | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| Now-serving display | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **มัดจำ** | ❌ | ✅ | ✅ QR+bank link | ❌ | ✅ QR+สลิป | ⚠️ prepay | ✅ บัตร |
| **นับ no-show / ความน่าเชื่อถือลูกค้า** | ❌ | ❌ | ❌ | ✅ นับ | ❌ | ⚠️ | ✅ |
| CRM ต่อเบอร์ + โน้ต | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| Insights + **กำไรสุทธิ** | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ POS | ✅ add-on |
| Near-me / SEO หน้าร้าน | ✅ / ❌ | ❌ / ✅ content | ❌ | ❌ | ❌ | ✅ | ✅ |
| ตารางงาน/วันหยุดช่าง | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ POS | ✅ |
| Export ข้อมูลลูกค้า | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Security (CSP, audit, session revoke) | ✅ | ? | ? | ? | ? | ? | ✅ |
| ราคาร้าน | ฿0 | ฟรี–539 | ฟรี–2,490 | ฟรี–1,490 | 999–4,999 | ฟรี+คอม | 350–525/คน |

**ช่องแดงที่เจ็บที่สุด 3 ช่อง (ไม่เปลี่ยนจาก ก.ค. และคู่แข่งฟรีก็มีแล้ว): reminder · มัดจำ · no-show**

---

## 6. ส่วนที่ 5 — ข้อเสนอ: ควรสร้างอะไร เรียงอย่างไร

ICE = Impact × Confidence × Ease (1–10, /100) · **[หนี้]** = สัญญา/table-stakes ที่ค้าง · **[เดิมพัน]** = ไม่มีใครในไทยทำ · **[UX]** = ใช้ง่ายขึ้นทันที · ✅ on-stack · ⚠️ ต้องเพิ่มของ

### 6.1 🔴 NOW — 0–6 สัปดาห์: ปิดหนี้ให้หมดก่อนเดิมพัน

| # | ข้อเสนอ | I | C | E | ICE | Tag | เหตุผล/วิธี |
|---|---|---|---|---|---|---|---|
| **N1** | **Reminder T-24 ชม. + T-2 ชม. ผ่าน LINE** พร้อมปุ่ม "กำลังมา / เลื่อน / ยกเลิก" | 10 | 9 | 7 | **6.3** | [หนี้] | ของมีครบ (flex, client, log, postback) ขาด scheduler — **ใช้ `pg_cron` ที่ `20261024…` เปิดไว้แล้ว** เรียก route handler ที่ลงนามด้วย secret หรือ `vercel.json` cron; guardrail push/เดือน (Basic 15,000 ÷ ~4 push/การจอง ≈ 3,750 การจอง/เดือน) |
| **N2** | **สถานะ `no_show`** + ปุ่ม "ไม่มา" ในรายการวันนี้ + สรุปใน insights (อัตรา no-show ร้าน, ต่อเบอร์) | 8 | 9 | 8 | **5.8** | [หนี้] | migration เล็ก (เพิ่ม enum, ไม่กระทบ GiST เพราะ constraint ครอบเฉพาะ confirmed/completed); **เป็นฐานของ X2/X3** และวัดผล N1 |
| **N3** | **SEO primitives**: `sitemap.ts`, `robots.ts`, `LocalBusiness`+`Service` JSON-LD บน `/shops/[handle]`, `metadataBase`/canonical, OG image | 8 | 8 | 9 | **5.8** | [หนี้] | MeQueue ชนะเราด้าน content SEO; near-me ที่ ship แล้วมีมูลค่า organic ≈ 0 ถ้าไม่ index |
| **N4** | **Checklist +2 ขั้น**: "เชื่อม LINE (ร้านรับแจ้งเตือน)" และ "รับการจองจริงครั้งแรก" (north-star) + CTA ส่ง QR/ลิงก์ให้ลูกค้าประจำ 5 คนแรก | 8 | 8 | 8 | **5.1** | [หนี้][UX] | `setup-checklist.ts` รองรับอยู่แล้ว เพิ่ม facts 2 ตัว |
| **N5** | **Export CSV ฝั่งร้าน** (ลูกค้า + ประวัติจอง) และ **"ดาวน์โหลดข้อมูลของฉัน" ฝั่งลูกค้า** (`/me/profile`) | 7 | 9 | 8 | **5.0** | [หนี้] PDPA | ปิดกฎ 14 ก.ย. 2026, ปิดคำโจมตี "ลูกค้าเป็นของใคร", เป็นหลักฐาน "ไม่มัดมือชก"; ข้อมูลครบใน `customer-crm.ts` |
| **N6** | **Playbook ใน `/shop/share`**: ภาพ rich menu พร้อมลิงก์จอง + วิธีวางลิงก์บน Google Business Profile / Facebook / IG bio + ป้าย QR พิมพ์ได้ | 7 | 8 | 9 | **5.0** | [หนี้] | ไม่ต้องเขียน logic; ปิด objection "ร้านฉันมี OA อยู่แล้ว" |
| **N7** | **ล้าง BACKLOG.md** ถอด OPP-15/23 ย้าย 10 รายการที่ ship แล้ว | 5 | 10 | 10 | **5.0** | [หนี้] | ค้างตั้งแต่ ก.ค. |
| **N8** | **Bot ตอบ "ว่างไหม / อีกกี่คิว"** ใน LINE (Reply ฟรี): ลูกค้าพิมพ์ชื่อร้านหรือกดจาก rich menu → สถานะคิวสด + ช่องว่างถัดไป + ลิงก์จอง; ฝั่ง group ร้าน: "คิววันนี้" สรุป | 8 | 7 | 7 | **3.9** | [เดิมพัน][UX] | แก้ I8 ตรง ๆ; ใช้ `getShopPublicQueueStatus` + slot-math ที่มี; Meta ฟรีทำ "ตอบแชท" แต่ไม่รู้ inventory เรา |

**ถ้าทำได้แค่ 2 อย่างใน 30 วัน: N1 + N2** — เพราะเป็นสิ่งที่คู่แข่งฟรี 5 รายมีหมดแล้ว และเป็นฐานของทุกเดิมพันใน §6.2

### 6.2 🟡 NEXT — ไตรมาสถัดไป: 3 เดิมพันที่ไม่มีใครในไทยทำ + engine gaps

**เดิมพัน X1 — "ความจริงเรื่องเวลา" สองทาง** [เดิมพัน]
- **ร้าน**: ปุ่มเดียว "ร้านช้า 15 / 30 / 45 นาที" บนรายการวันนี้ → อัปเดต ETA บนหน้าสดของลูกค้าทุกคนที่เหลือ (pull ฟรี) + push เฉพาะคนที่คิวอยู่ใน 60 นาทีถัดไป (จำกัดต้นทุน) · ปุ่ม "เปิดช้า/ปิดวันนี้" กรณีฉุกเฉิน
- **ลูกค้า**: ปุ่ม "สายนิดนึง ~10 นาที" ข้าง "กำลังมา" (postback เดิม) → ร้านเห็นในรายการ, ถ้าสายเกินกฎร้าน (ค่าเริ่มต้น 15 นาที ตาม I3) ระบบเสนอ "ปล่อยคิว/เลื่อน" อัตโนมัติ
- **ETA จริงบนหน้าสด**: "อีก N คิว ≈ เริ่มราว 14:40" จาก `queue-position.ts` + ระยะเวลาบริการที่เหลือ (ตอนนี้โชว์แค่จำนวนคิว)
- วิธีวัด: จำนวนครั้งที่ร้านกด "ช้า" (ความซื่อสัตย์ของระบบ), อัตราข้อร้องเรียน "จองแล้วรอ", อัตรา "สายนิดนึง" ที่ไม่กลายเป็น no-show
- ICE 8×7×6 = **3.4** · ✅ on-stack (เพิ่มคอลัมน์ `shops.delay_minutes_today` + `bookings.late_eta_at`)

**เดิมพัน X2 — ความน่าเชื่อถือลูกค้าต่อเบอร์ + มัดจำแบบมีเงื่อนไข (ไม่ต้องมี payment gateway)** [เดิมพัน]
- ต่อยอด N2: ต่อ (ร้าน × เบอร์) นับ มา / ไม่มา / ยกเลิกสาย / เลื่อนบ่อย → badge ใน `NewBookingDialog`, CRM และรายการวันนี้: "ลูกค้าใหม่ · ประจำ 12 ครั้ง · เคยเทคิว 1"
- ร้านตั้งนโยบายมัดจำ: ปิด / ลูกค้าใหม่เท่านั้น / เฉพาะเคยเท / ทุกคน; จำนวนเงิน; กฎสาย 15 นาที; กฎคืน (ก่อน 24 ชม. คืน / หลังนั้นริบ) — **แสดงเป็นข้อความกลางก่อนยืนยันจอง** และในข้อความยืนยัน LINE (แก้ I1/I2 เรื่อง "ใจอ่อน" ด้วยกฎที่เขียนไว้แล้ว)
- การเก็บเงิน: ร้านอัปโหลด PromptPay QR ของตัวเอง (R2 มีแล้ว) → ลูกค้าอัปโหลดสลิปในหน้า `/bookings/[id]` → ร้านกด "ได้รับแล้ว" (สถานะ `deposit_pending → deposit_paid`) · ไม่ตรวจสลิปอัตโนมัติในเฟสนี้ (SlipOK/EasySlip เป็น add-on ภายหลัง) · **ไม่ถือเงินแทนร้าน ไม่ต้องมีใบอนุญาต payment**
- จองที่ค้างมัดจำเกิน X นาทีถูกปล่อยอัตโนมัติ (ใช้ scheduler จาก N1)
- ICE 9×7×5 = **3.2** · ⚠️ ต้องตาราง `booking_deposits` + policy บน `shops`
- หมายเหตุเชิงจุดยืน: นี่คือ "เครื่องมือกฎมัดจำ" ไม่ใช่ "ระบบรับเงิน" — ไม่ชน "อย่าทำ card-on-file" ของ brief ก.ค.

**เดิมพัน X3 — ลูกค้าประจำ/ช่างประจำเป็นของจริง** [เดิมพัน]
- VIP/ประจำ: tag ต่อเบอร์ต่อร้าน (ตั้งเองหรืออัตโนมัติเมื่อมา ≥N ครั้ง) → waitlist first-refusal, ร้าน "กันช่อง" ให้, ปุ่ม "จองให้ลูกค้าประจำ" เร็ว
- "ช่างประจำของคุณ": จำช่างล่าสุดต่อ (เบอร์ × ร้าน), one-tap rebook "จองช่างเดิม บริการเดิม" จากการ์ด completed และจากข้อความ LINE หลังเสร็จ (reply ฟรี)
- Staff view: ลิงก์ `/shop/staff/[token]` แบบเดียวกับ display token → ช่างเห็น "คิวของฉันวันนี้" กด "เริ่ม/เสร็จ" ได้ (แก้ I10 และร้าน 3–5 ช่างที่ใช้ login เดียว)
- ICE 7×8×6 = **3.4** · ✅ on-stack

**Engine gaps ที่ต้องปิดในไตรมาสนี้** (ตลาดยืนยันว่ามีร้านแบบนี้จริง — §4.2)

| # | ข้อเสนอ | ICE | หมายเหตุ |
|---|---|---|---|
| E1 | **ตารางงาน/วันหยุด/พักเที่ยงต่อช่าง** | 7×9×6 = 3.8 | `shop_staff_hours` + `shop_staff_time_off`; slot-math ต้องรับ availability ต่อช่าง; เปิดทาง "ย้ายช่างอัตโนมัติเมื่อช่างลา" (T3) |
| E2 | **เวลาเปิดข้ามเที่ยงคืน** | 6×9×6 = 3.2 | เปลี่ยน `open >= close` เป็นรองรับ wrap; Bangkok date math ต้องระวัง |
| E3 | **Buffer เตรียม/เก็บต่อบริการ** | 6×9×7 = 3.8 | `shop_services.buffer_after_minutes`; GiST ใช้ `time_range` รวม buffer |
| E4 | **Any-staff ย้ายได้ (Dynamic Reassignment)** | 7×7×5 = 2.5 | booking ที่ลูกค้า "ไม่ระบุช่าง" ย้ายช่างได้เมื่อช่างเต็ม/ลา; ห้ามย้ายถ้าลูกค้าเลือกเอง (กฎเดียวกับ Fresha) |
| E5 | **Soonest-slot ranking ใน discovery** (OPP-11) | 7×8×6 = 3.4 | ใช้ slot-math เดิม; label "ว่างเร็วสุด 14:30" บนการ์ดร้าน |

**UX quick wins** (ทำแทรกได้ทุกสปรินต์)
- U1 **จองเสร็จ <60 วินาที**: prefill จาก session ✅ มีแล้ว → เพิ่ม "จองซ้ำบริการ/ช่างเดิม" 1 แตะ, ซ่อนขั้นเลือกช่างเมื่อมีคนเดียว ✅ มีแล้ว, แสดงราคา+เวลา+หมายเหตุราคาบนชิปบริการ (I-ราคาไม่ชัด)
- U2 **Add to Home Screen + Web Push + .ics**: manifest + ปุ่ม "เพิ่มลงหน้าจอ" หลังจองครั้งแรก; Declarative Web Push เป็น fallback เมื่อลูกค้าไม่เชื่อม LINE (ฟรี ไม่กิน quota); ปุ่ม "เพิ่มลงปฏิทิน"
- U3 **ภาษา**: ใช้ "จองคิว" เป็นคำหลักทุก persona, "คิวตอนนี้" สำหรับลำดับสด, "ลูกค้าประจำ" แทน VIP (I6)
- U4 **Display privacy mode** ✅ มีการปิดบังชื่อแล้ว → เพิ่มโหมด "เลขคิวอย่างเดียว" และโหมด TV (ตัวใหญ่, ไม่มีชื่อ)
- U5 **Attribute ช่าง**: เพศ (optional) + ความถนัด → ลูกค้ากรอง "ช่างหญิง" ได้ (I-เพศ/ความเป็นส่วนตัว)
- U6 **Insights ที่ตอบคำถามเจ้าของ**: no-show rate, ใหม่ vs ประจำ, rebook rate, ชั่วโมงพีค heatmap, จุดคุ้มทุนจาก expenses (มีข้อมูลครบ)
- U7 **Analytics ของเราเอง** (privacy-friendly, self-host หรือ Vercel Analytics) เพื่อวัด funnel จอง: เปิดหน้าร้าน → เลือกบริการ → เลือกเวลา → ยืนยัน

### 6.3 🟢 LATER — รอหลักฐาน / รอ liquidity

| # | ข้อเสนอ | เงื่อนไขก่อนทำ |
|---|---|---|
| L1 | **LINE MINI App (Unverified) เป็นทางเข้า** — ไม่ใช่ LIFF เต็มรูป | หลัง N6 วัดว่า rich-menu deep link ไม่พอ; ยอมรับว่าไม่มี Service Message; ใช้ LIFF ≥ v2.31.1 |
| L2 | **แพ็กเกจนับครั้ง / คอร์ส** (OPP-20 รุ่นเบา: ร้านบันทึก "เหลือ 7/10 ครั้ง" ไม่มีการจ่ายเงินในระบบ) | มีร้านสปา/นวดจริง ≥20 ร้านขอ |
| L3 | **AI ราคาถูก**: ร่างคำตอบรีวิวให้ร้าน, "สรุปลูกค้า" จากโน้ต+ประวัติ (cheatsheet แบบ Phorest), เขียนคำอธิบายบริการจาก presets | ทำหลังมีรีวิว/โน้ตจริงพอ; ใช้ API เรียกครั้งละน้อย ต้นทุนต่ำ |
| L4 | **ตรวจสลิปอัตโนมัติ** (SlipOK/EasySlip) ต่อจาก X2 | X2 มีร้านใช้มัดจำ ≥30% |
| L5 | **Reserve with Google / Apple Business Connect action link** | ยืนยันว่า RwG รองรับไทยสำหรับ non-GoWabi; ระหว่างนี้ใช้ N3+N6 |
| L6 | **Multi-branch + roles** | ร้าน 2 สาขาจริงขอ; staff view (X3) ครอบ 80% ของความต้องการก่อน |
| L7 | **Monetization**: tier "Pro" ≤ 499 บาท/เดือน gate เฉพาะ มัดจำอัตโนมัติ, AI, สาขา, ประวัติ >1 ปี — **ไม่ gate reminder/ข้อความ** (คู่แข่งทุกรายทำ เราคือข้อต่าง) | หลังมีร้าน active ≥100 และ push/เดือน ใกล้ 10,000 |
| L8 | Web passkey แทน PIN | passkey-ready 95% แล้ว แต่ผู้ใช้สร้างจริง ~15–20%; ทำเมื่อ friction PIN วัดได้ว่าเป็นปัญหา |

### 6.4 ❌ อย่าทำ (อัปเดต)

| อย่าทำ | เหตุผล |
|---|---|
| Card-on-file / ถือเงินแทนร้าน | เดิม — ไม่มี processor, ไม่มีใบอนุญาต; X2 เป็น "บันทึกมัดจำ" ไม่ใช่รับเงิน |
| สงครามส่วนลด/cashback/marketplace | GoWabi >10,000 ร้าน + OR หนุน 145 ล้าน |
| Native app | ทำลาย "ไม่ต้องโหลดแอป"; iOS 26 ทำให้ web app พอแล้ว |
| Loyalty/แต้ม/referral กลับมา | ลบโดยเจตนา; X3 "ลูกค้าประจำ" ตอบ JTBD เดียวกันโดยไม่ต้องมี ledger |
| **AI chatbot ตอบแชททั่วไป** 🆕 | Meta Business AI ฟรีในไทยแล้ว; LINE AI Chatbot 555 บาท; ทำเฉพาะ bot ที่รู้ inventory จริง (N8) |
| **AI receptionist รับสาย** 🆕 | ราคาตลาด $99–399/เดือน สำหรับร้านที่กำไร 19,000 บาท/เดือน; salon เป็น 5.4% ของผู้ใช้ |
| **Unified inbox / CRM แชท** 🆕 | FoxConnect ทำแล้ว, LINE MyTeam มาปี 2027 — สนาม LINE เอง |
| **LIFF เต็มรูปก่อน rich menu + Unverified MINI App** | เงื่อนไข LINE เปลี่ยน (ไม่มี Service Message, LIFF เวอร์ชันถูกบล็อก) |
| ขาย "ฟรี" เป็นจุดขายหลัก | ฟรีถาวรมี ≥5 ราย — ขาย "ไม่ต้องมี OA, ไม่จ่ายค่าข้อความ, ไม่เก็บคอม, เอาข้อมูลออกได้" แทน |

---

## 7. จะชนะอย่างไร — positioning ที่ยืนได้หลัง NOW+NEXT

**คำมั่นที่พูดได้วันนี้** (ของมีจริง): "ลูกค้ารู้เองว่าเหลืออีกกี่คิว" · "ร้านไม่ต้องมี LINE OA เราส่งแจ้งเตือนให้" · "เลื่อน-ยกเลิกเองได้ตามกฎร้าน" · "ลูกค้าเต็ม → รอคิวว่างได้" · "จอคิวหน้าร้านฟรีจากมือถือเก่า" · "เห็นกำไรสุทธิ"

**คำมั่นที่พูดได้หลัง NOW (6 สัปดาห์)**: "เตือนก่อนถึงคิว 2 ครั้ง ลูกค้ากดยืนยันได้ใน LINE" · "รู้ว่าใครเทคิว" · "ถาม LINE ว่าว่างไหมได้เลย ไม่ต้องรอแอดมิน" · "ข้อมูลลูกค้าเป็นของคุณ ดาวน์โหลดได้ทุกเมื่อ"

**คำมั่นที่พูดได้หลัง NEXT (ไตรมาส)**: "ร้านช้าก็บอกลูกค้าได้ปุ่มเดียว ลูกค้าสายก็บอกได้" · "เก็บมัดจำเฉพาะคนที่ควรเก็บ ด้วยกฎที่ลูกค้าเห็นก่อนจอง" · "ลูกค้าประจำได้คิวว่างก่อนใคร" · "ช่างแต่ละคนเห็นคิวตัวเอง ลาวันไหนตารางปิดเอง"

**เสาที่คู่แข่งไทยพูดตามไม่ได้เชิงโครงสร้าง**: (1) ต้นทุน LINE เป็นของเรา (2) live queue ต่อเลนช่าง + hybrid walk-in (3) ความจริงเรื่องเวลาสองทาง (4) ความน่าเชื่อถือต่อเบอร์ข้ามการจองทุกแบบ (เพราะเราใช้เบอร์เป็น identity ตั้งแต่แรก) (5) anti-lock-in (export) — ข้อ 3–5 ไม่มีใครในตารางทำ

---

## 8. ความเสี่ยง & สมมติฐานที่ต้อง validate

| สมมติฐาน | ระดับ | การทดลองที่ถูกที่สุด |
|---|---|---|
| reminder 2 ครั้งลด no-show จริงในร้านเรา | สูง | N2 ก่อน N1 → เปรียบเทียบ 4 สัปดาห์ก่อน/หลังใน 2 ร้าน demo + ร้านจริงแรก |
| push/เดือน อยู่ใต้ Basic 15,000 เมื่อเพิ่ม reminder ×2 | สูง | นับจาก `line_message_log`; alert ที่ 12,000; ปิด T-2h ก่อนถ้าเกิน |
| ร้านยอมใช้ "ร้านช้า" อย่างซื่อสัตย์ | กลาง | วัดจำนวนกด vs ข้อร้องเรียน; ทำปุ่มให้กดง่ายกว่าไม่กด |
| มัดจำแบบบันทึก (ไม่ตรวจสลิปอัตโนมัติ) ร้านยอมรับ | กลาง | สัมภาษณ์ร้านเล็บ/ขนตา 5 ร้านที่เก็บมัดจำอยู่แล้ว |
| LINE ไม่ออก booking/queue เอง | **สูงสุด (ไม่เปลี่ยน)** | ติดตาม LINE for Business รายเดือน; MyTeam 2027 เป็นสัญญาณ |
| RwG ใช้ในไทยได้สำหรับ non-GoWabi | กลาง | ทดลองใส่ booking link ใน GBP ของร้าน demo แล้วดูว่า Google ดึงหรือไม่ |
| PDPA access-request จะมีคำขอจริง | ต่ำ–กลาง | N5 ทำครั้งเดียวจบ ต้นทุนต่ำกว่าเสี่ยง |

**ช่องข้อมูลที่ยังปิดไม่ได้**: % คอมมิชชัน GoWabi · ราคา QueQ/Botnoi · Meta Business Agent (รุ่นจอง) ในไทย · วันเปิด MeQueue AI Receptionist · สถิติ "จองผ่านแชท vs เว็บ" สำหรับ beauty · RwG ประเทศที่รองรับ · no-show rate ร้านไทยที่วัดจริง (ไม่มีผลสำรวจใดเลย — **N2 จะทำให้เราเป็นรายแรกที่มีตัวเลขไทยจริง** และเป็นคอนเทนต์การตลาดได้)

---

## 9. Sources (เข้าถึง 2026-10-24)

**LINE / Meta**: lineforbusiness.com/th/service/lineminieats · lineforbusiness.com/th/service/line-oa-features · lineforbusiness.com/th/service/line-oa-features/oa-chat-package · developers.line.biz/en/news/2026/ · developers.line.biz/en/docs/line-mini-app/submit/submission-guide/ · relevantaudience.com/digital-marketing-en/line-thailand-business-solutions-2026/ · everydaymarketing.co/marketing-platform/line-update-2027-marketers/ · brandbuffet.in.th/2026/08/line-thailand-business-insights-2026-trusted-platform/ · linebot.pro/blog/line-mini-apps-thailand-2026 · mgronline.com/cyberbiz/detail/9690000023811 · techsauce.co/news/meta-business-ai-messenger-thailand · techcrunch.com/2026/06/03/metas-ai-agent-for-whatsapp-business-is-now-available-globally/

**คู่แข่งไทย**: betaskthai.com/be_linked/ · betaskthai.com/salon-queue-system/ · mequeue.app/ · bookq.app/ · queuebooking.com/ · queue-d.app/blog/pricing-explained · nudnow.com/ · getbookio.com/ · foxconnect.app/pricing/ · zwiz.ai/th/pricing · loga.app/pricing · xn--42c7ba8ax4c5a.com (Q Natural) · gowabi.com/blog/2026/07/what-is-gowabi/ · gowabi.com/en/partner · pos.gowabi.com · queq.me · fresha.com/pricing · thansettakij.com/technology/637354 (LMWN × JERA) · onquethai.com/solutions/nail-salon-booking

**เทรนด์โลก**: fresha.com/blog/fresha-ai-powered-intelligent-scheduling-beauty-wellness · creativeheadmag.com (Fresha Connect, Phorest AI) · windpress.info (Fresha Reputation Manager) · biz.booksy.com/blog/booksy-new-plugin-inside-chatgpt · prnewswire.com (Zenoti AI Workforce) · zenoti.com/thecheckin/the-2026-beauty-and-wellness-benchmark-report-salon-edition · square.com press (Waitlists) · waitwhile.com/pricing/ · help.waitwhile.com (App Clips) · business.yelp.com/restaurants/products/yelp-host/ · seroundtable.com/google-lsa-expands-booking-partners-41945.html · 9to5google.com/2025/11/17/google-ai-mode-travel/ · cochrane.org/CD007458 · bookrhub.com/en/no-show-report-2026 · webkit.org/?p=16535 (Declarative Web Push) · mjtsai.com/blog/?p=49472 (iOS 26 web apps) · state-of-passkeys.io · pabau.com/blog/fresha-pricing/ · koalendar.com/blog/booksy-pricing · mlex.com (กขค. commission freeze)

**เสียงเจ้าของร้าน/ลูกค้า**: legardy.com/free-qna/356 · pantip.com/topic/41797780 · today.line.me/th/v3/article/rmvGVDn · lemon8-app.com/@sutimon_kung/7523431842281046536 · lashurybeauty.com/reservation/ · lemon8-app.com/@shinemassage1/7340153450174448129 · lemon8-app.com/@berryy_bumbim/7446363033678823943 · thairath.co.th/news/local/north/2924813 · pantip.com/topic/40307740 · lemon8-app.com/@ladyypim/7341646557101507073 · pantip.com/topic/43145884 · pantip.com/topic/42794943 · dailynews.co.th/news/3260236/ · pantip.com/topic/40518801 · pantip.com/topic/42734543 · pantip.com/topic/33935840 · apps.apple.com/th/app/queq-no-more-queue-line/id876343584 · thaipr.net/business/3771247 (Kantar × LINE) · kasikornresearch.com (ตลาดความงาม 2568–69) · spacebar.th (DBD ธุรกิจความงาม) · posttoday.com/business/716686 (สบส. ร้านนวด/สปา) · tnnthailand.com/wealth/economy/183386/ (SCB EIC) · hrzoft.com (ค่าแรง 2569) · pantip.com/topic/39241618 · it24hrs.com/2026/pdpa-personal-data-access-request-rules-2026/ · thaipublica.org/2026/06/bot-standardised-financial-service-fees/
