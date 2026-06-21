# Competitive Brief — Quego (LuxeQueue / Aura Queue)

> ฉบับ **baseline** · ณ **2026-06-21** · จัดทำโดย `@product-manager` (agent) + research fleet
> วิธีอ่าน: **[FACT]** ยืนยันแล้ว (โค้ด/แหล่งอ้างอิงสด) · **[ASSUMPTION]** อนุมาน · **[REC]** ข้อเสนอแนะ · *unverified* ยังยืนยันไม่ได้
> ทุกข้อมูลคู่แข่ง access date 2026-06-21 (ดู §11 Sources)

---

## 1. TL;DR / แนวทาง

**Quego สร้างจริงไปไกลกว่าเอกสารของตัวเองมาก — และนั่นเปลี่ยนกลยุทธ์** [FACT]. BACKLOG/STRATEGY ยังเขียนว่า "LINE = copy ไม่มี API, ไม่มี live queue, ไม่มี waitlist, ไม่มี reschedule" แต่โค้ดวันนี้ขัดกับเอกสารนั้น: LINE push/reply ต่อสายจริง, live queue-position math, waitlist + LINE slot-offer, reschedule, stamp-card loyalty, walk-in QR, รายงานกำไรสุทธิ — **ship แล้วทั้งหมด**. เราประเมินตัวเองต่ำไป

**แต่ผลวิจัยคู่แข่งที่ verify เสร็จแล้วบีบ wedge ให้แคบลงและคมขึ้น:** "LINE-native booking" **ไม่ใช่ moat อีกต่อไป** — BeTask (฿999/mo), QueueBooking (ฟรี→฿1,490), ZERVA (ฟรี), Loga, และแม้แต่ SimplyBook.me ทำ LINE-native booking ได้หมดแล้ว [FACT]. positioning เดิมของ STRATEGY ("LINE-native × ฟรี") จึงถูกกร่อนไปครึ่งหนึ่ง

**Wedge ที่ป้องกันได้จริง เหลือ 4 เสา — ต้องเดิมพันที่นี่:**
1. **Live-queue concierge / call-ahead loop** — มีแค่ QueQ ที่ทำ live queue แต่ปฏิบัติกับร้านตัดผมเหมือนธนาคาร + geofence + ไม่มี LINE. **ไม่มีคู่แข่ง LINE-native ไทยรายใดมีคิวสด** [FACT]
2. **Booking engine race-safe ต่อช่าง (GiST overlap)** — BeTask โฆษณา "แก้คิวซ้ำ ช่างหลายคน" แต่ **เอกสารตัวเองไม่มีรายละเอียดกลไกกันดับเบิลบุ๊กต่อช่างเลย** → จุดอ่อนที่พิสูจน์ได้ของคู่แข่งตรงที่สุด คือจุดแข็งของเรา [FACT]
3. **Loyalty ที่ฝังในระบบ** — BeTask มี loyalty แต่เป็น "Be Loyalty" แยก login (bolted-on); ของเราผูกเบอร์รวมกับ booking [FACT]
4. **"ฟรีจริง" — แต่ป้องกันได้ก็ต่อเมื่อออกแบบข้อความเป็น LINE reply ไม่ใช่ push** (ดู §3 — นี่คือข้อค้นพบสำคัญที่สุดของรอบนี้)

**3 การตัดสินใจที่ต้องทำเดี๋ยวนี้:**
1. **หยุดเชื่อ BACKLOG/STRATEGY เก่า → re-audit + reposition.** หน้าแรกฝั่งร้านยังขายของที่ ship แล้วไม่เป็น proof
2. **ออกแบบ LINE messaging เป็น reply-first** เพื่อให้ "ฟรี" จริง (push = เสียเงินร้านทุกข้อความ)
3. **เล็ง BeTask เป็นคู่แข่งหัวต่อหัว** — ชนะด้วย engine depth + live queue + integrated loyalty + ฟรี; ตามให้ทันด้วย LIFF (จองในLINE) และพิจารณา PromptPay-QR deposit (BeTask พิสูจน์แล้วว่าทำได้โดยไม่ต้อง card processor)

**อย่าทำ:** payments แบบ card-on-file, สงครามส่วนลด/cashback, ไล่ feature parity กับ Fresha. **North-star = shop activation** (registered → first real booking) คือเข็มทิศของทุกข้อเสนอ

---

## 2. Where we stand today — capability ที่เคลมได้จริง (verified ในโค้ด) [FACT]

spot-check `src/lib/services/`, `src/lib/booking/`, `src/lib/line/`, `src/app/` แล้ว นี่คือเส้นแบ่ง **shipped จริง vs เอกสาร/มาร์เก็ตติ้ง**:

| ความสามารถ | สถานะจริง | หลักฐานในโค้ด |
|---|---|---|
| Booking engine (per-service duration, parallel-staff, GiST overlap, shared slot-math) | ✅ **crown jewel ของจริง** | `lib/booking/slot-math.ts`, `bookings.ts` (GiST `23P01` retry) |
| **LINE Messaging push + reply** | ✅ **ต่อสายจริง** (ไม่ใช่ copy แล้ว) | `lib/line/client.ts` (fail-silent, 429→over_quota, timeout); เรียกจริงที่ `shop-line.ts`, `line-linking.ts` |
| **Live queue position** "อีก N คิวก่อนถึงคุณ" | ✅ shipped | `lib/booking/queue-position.ts`, `/bookings/[id]` LiveBookingQueue |
| **Waitlist + LINE slot-offer** | ✅ shipped | `services/waitlist.ts`, `lib/waitlist/eligibility.ts`, `line/waitlist-flex.ts`, `/me/waitlist` |
| **Reschedule ด้วยตนเอง** (UUID-gated, rate-limited) | ✅ shipped | `/bookings/[id]/reschedule/`, `rescheduleBooking` |
| **LINE two-way actions** (กำลังมา/เลื่อน/ยกเลิก) | ✅ shipped | `services/line-booking-actions.ts`, `line/message-commands.ts` |
| **Walk-in QR self-join** (ไม่ต้อง login) | ✅ shipped | `/shops/[id]/walk-in/`, `WalkInForm.tsx` |
| **Now-serving kiosk display** (ไม่ใช้ฮาร์ดแวร์) | ✅ shipped | `/shop/display`, `shop-display.ts` |
| **Stamp-card loyalty** (integrated) | ✅ shipped ใหม่ | `services/promotions.ts`, `lib/promotions/stamp-card.ts`, `/shop/promotions` |
| Loyalty credit + referral (ผูกเบอร์) | ✅ shipped | `loyalty.ts`, `/me/credit` |
| CRM-lite (visit history + notes ต่อเบอร์) | ✅ shipped | `customer-crm.ts`, `customer-notes.ts`, `/shop/customers/[phone]` |
| Reviews (gated to completed) | ✅ shipped | `reviews.ts`, `/shops/[id]` |
| รายงาน: รายจ่าย + กำไรสุทธิ + insights | ✅ shipped ใหม่ | `expenses.ts`, `insights.ts`, `/shop/insights` |
| Rate-limit + lockout (login PIN), Firebase phone-OTP (register) | ✅ shipped | `lib/auth/lockout.ts`, `lib/firebase/` |
| Per-shop share link + QR | ✅ shipped | `/shop/share`, `ShareTools.tsx` |
| **LINE LIFF / in-app booking (จองในLINE ไม่ต้อง login)** | ❌ **ยังไม่มี** (มี OAuth-linking ไม่ใช่ LIFF) | OPP-09 เปิด |
| Near-me / geo discovery · Soonest-slot ranking | ❌ ยังไม่มี | grep ไม่พบ |
| Real VIP priority/bump | ⚠️ partial (VIP = color token) | OPP-13 เปิด |
| Payments / deposit / card-on-file | ❌ ไม่มี (ตามข้อจำกัด) | ไม่มี processor |

> **ข้อสังเกตเชิงกลยุทธ์ที่สำคัญสุด [FACT]:** **โค้ดแซง BACKLOG/STRATEGY ไปแล้ว**. ผลคือ (ก) เราขายตัวเองต่ำกว่าจริง, (ข) เสี่ยงตัดสิน roadmap จากแผนที่ล้าสมัย → **re-audit BACKLOG เป็นงานแรก** (R1)

---

## 3. ⚠️ LINE economics — ข้อค้นพบที่เปลี่ยนการออกแบบ "ฟรี" [FACT, official LINE sources]

นี่คือ landmine ที่ซ่อนอยู่ใต้ positioning "ฟรี + เตือน LINE" ของเรา:

**ราคา LINE OA ไทย 2026 (verified, lineforbusiness.com/th + developers.line.biz, +7% VAT):**
| Plan | ฿/เดือน | broadcast รวม/เดือน | ส่วนเกิน/ข้อความ |
|---|---|---|---|
| **Free** | 0 | **300** (ลดจาก 500) | ส่งเกินไม่ได้ — หยุดจนเดือนหน้า |
| Basic | 1,280 | 15,000 | 0.10 |
| Pro | 1,780 | 35,000 | 0.06 |

**กลไกการนับ (สำคัญที่สุด):**
- **เสียเงิน (นับโควต้า):** push, multicast, broadcast, narrowcast — **นับ "ต่อผู้รับ"** (broadcast หา 5 คน = 5 ข้อความ)
- **ฟรี (ไม่นับ):** **reply messages** (ตอบกลับข้อความที่ user เริ่มก่อน), auto-reply, greeting

**So-what สำหรับ Quego:**
- ถ้าเราส่ง reminder / "ใกล้ถึงคิว" / waitlist-offer เป็น **push → เผาโควต้าของร้าน**. Free 300/เดือนหมดเร็วมาก → ร้านต้องจ่าย ฿1,280+/เดือน → **"ฟรี" ของเรากลายเป็นไม่จริง** และข้อได้เปรียบหลักพังทันที
- ถ้าออกแบบให้ข้อความวิ่งเป็น **reply ภายใน active chat window** (หรือใน thread ที่ลูกค้าเริ่ม) → **ฟรีจริง**
- **[REC] นี่คือ product-design constraint ระดับ first-order ไม่ใช่รายละเอียด:** reminder/queue/waitlist loop ต้องออกแบบรอบ reply ให้มากที่สุด, ใช้ push เท่าที่จำเป็น, และวัด "push ต่อร้านต่อเดือน" เป็น guardrail metric. ก่อนเคลม "ฟรี" ในมาร์เก็ตติ้ง ต้องพิสูจน์ว่า loop อยู่ใต้ 300 push/เดือน/ร้าน หรือเป็น reply ล้วน
- **[FACT] LINE ไม่มี native booking** (MyShop = e-commerce, OA = แค่ rich menu/auto-reply) — ช่องนี้ของเราถูกต้อง ตลาดเต็มไปด้วย third-party ที่ขายช่องนี้ (ดู §4)

---

## 4. Competitive landscape (segmented · verified · accessed 2026-06-21)

### Direct — LINE-native booking ฝั่งไทย (สนามจริงของเรา)

**BeTask (Be Linked) — คู่แข่งหัวต่อหัวที่สุด** [FACT, betaskthai.com]
LINE-OA-native booking + queue + loyalty, **ไม่ต้องโหลดแอป** (rich menu). ราคา flat **ไม่หัก GP**: S **฿999/mo** (600 จอง/เดือน) · M ฿2,999 (1,200) · L ฿4,999 (2,400) · XL ติดต่อ; ทดลอง 7 วัน. มี **PromptPay QR deposit** (อัปสลิป+verify), reminder LINE/SMS/email, dashboard, broadcast segmentation. การตลาดยิงตรง pain เดียวกับเรา: TikTok @betaskthai *"ปัญหาคิวซ้ำ ช่างหลายคน ลงคิวไม่ทันโดนลูกค้าวีน"*
- **จุดอ่อนที่พิสูจน์ได้ [FACT]:** เอกสารตัวเองพูดแค่ "เลือกช่างประจำ" — **ไม่มีรายละเอียดกลไกกันดับเบิลบุ๊กต่อช่าง** ทั้งที่โฆษณา "ช่างหลายคน"; loyalty เป็น **Be Loyalty แยก login** (bolted-on); tier cap จำนวนจอง (ดันขึ้น tier เร็ว); ไม่มี POS เอง
- **So-what:** เราชนะที่ engine race-safe ต่อช่าง (GiST) + live queue + loyalty ฝัง + ฟรี. เราตามที่ LINE-native entry (เขามี rich-menu booking, เรายังไม่มี LIFF) + PromptPay deposit (เขามี เราไม่มี). **engine depth ที่ DB-level overlap คือ wedge ที่สาธิตให้ร้านดูได้ ไม่ใช่แค่ parity**

**FoxConnect** [FACT, foxconnect.app] — LINE-native booking + CRM, **มี LIFF**. ราคา Solo ฿1,500/3 เดือน (฿5,000/ปี ≈ ฿500/mo effective), Plus ฿3,000/3ด, Premium ฿6,000/3ด; ทดลอง 30 วัน. tier ต่างที่ capacity. **ไม่มี live queue, ไม่โฆษณา loyalty engine**. → benchmark ราคาของเรา + แข็งเรื่อง "ทั้ง flow ใน LINE" (LIFF)
> **หมายเหตุ "iPlan":** ไม่ใช่ผลิตภัณฑ์ — เป็น **iPlan Digital เอเจนซีการตลาด** ที่สร้างบน FoxConnect [FACT, clutch.co]. จัดเป็น "ช่องทาง/เอเจนซี" ไม่ใช่คู่แข่ง product

**QueueBooking · ZERVA (ZWIZ.AI) · Loga · Fastwork builds** [FACT] — third-party LINE booking ราคาถูก/ฟรี: QueueBooking (LIFF, ฟรี 3 เดือน→฿1,490/mo), ZERVA (ฟรี→฿3,000/ปี), Loga (LINE + e-coupon/points), Fastwork (สั่งทำ ฿1,500+). → **พิสูจน์ว่า "LINE-native booking" คือ table-stakes ราคาถูก ไม่ใช่ของหายาก** — เราต้อง differentiate ที่ชั้นบน (live queue + engine + loyalty + ฟรีจริง)

### Direct — virtual queue / beauty marketplace

**QueQ** [FACT] — take-a-number คิวสด ฐานใหญ่ (เคลม 16M users, *unverified*) แต่ horizontal (ธนาคาร/ร้านอาหาร/ราชการ), **geofence** (เอียง on-site), ไม่มี staff/service depth, ไม่มี LINE booking. ราคาธุรกิจ ~฿6,000/mo/สาขา (*editorial, unverified*). → มีคิวสดแต่ไม่ salon-shaped; เราลอก "N ก่อนถึงคุณ" + two-stage push (มีแล้ว) และลงลึก duration/staff

**GoWabi** [FACT] — beauty marketplace ครองดีล/ส่วนลด + prepay voucher + รีวิว (เคลม 1M+) + near-me + cashback (~2.5%, *unverified*). 8,000+ partners (2022). **หักค่าคอม** (% *unverified*). PTT OR หนุน (Series A+ US$4M). ไม่มี LINE-native booking, ไม่มีคิวสด → **อย่าสู้สงครามส่วนลด**; wedge "ไม่หักคอม + ฟรี" สะอาดเทียบ GoWabi

### Adjacent — global (ใช้เทียบ contrast)

**Fresha (อยู่ในไทยแล้ว)** [FACT] — Independent ฿525/mo, Team ฿350/mo/คน; POS + card-on-file + deposit + no-show protection (เคลม −89%) + waitlist; **เพิ่ม subscription ปี 2025** (wedge "ฟรี" เดิมหาย). ชนะเรื่อง payments/no-show แบบบัตร — **อย่าไปสู้ตรงนั้น**; เราชนะเรื่อง LINE + ฟรีจริง + ไม่ต้องสร้างบัญชี + คิวสด

**TimeTailor** [FACT] — free-core + **3.9% client-paid fee** + add-on $12/$9/$15; PromptPay + payout ธนาคารไทย; deposit/no-show; **ไม่มี LINE เลย** (refuted 5 หน้า), appointment-slot ไม่มีคิว. → LINE คือช่องโหว่ใหญ่สุดของเขาในไทย = differentiation ชัดของเรา

**SimplyBook.me** [FACT — แก้สมมติฐานเดิม] — **มี LINE native จริง** (LIFF + bot) → "เรามี LINE" ไม่ใช่ moat เทียบ SimplyBook. แต่ติด booking cap (50/100/mo), ration custom-feature (1/3/8), SMS pay-per-credit, onboarding อังกฤษเป็นหลัก, **ไม่มี live-queue concierge**. ฟรี $0 / Basic ~$11.9 / Standard $24.9 / Premium $49.9

**Square Appointments** [FACT] — **ไม่เปิดในไทย, ไม่มี LINE** (8 ประเทศ ไม่มี SEA). two-way SMS + card-on-file no-show แข็ง แต่ผูกเศรษฐศาสตร์บัตร US → non-competitor ในไทย

### Substitute — สิ่งที่ร้านใช้จริงวันนี้ (ศัตรูตัวจริง)

**"LINE chat + สมุดนัด/Excel"** [FACT — corroborated หลาย vendor + how-to] — ร้าน 1–5 ช่างจองผ่านแชต LINE + จดสมุด/ปฏิทิน บางร้านอัปเป็น Excel/Google Sheets; ข้อมูลลูกค้ากระจัดกระจายข้ามสมุด/ไฟล์/แชต. Pain ยืนยัน: no-show (ลืมนัด ไม่มีระบบเตือน), ดับเบิลบุ๊ก (สมุด+แชต โดยเฉพาะหลายช่าง), ตอบแชททั้งวัน, booking ตกหล่นในหลายห้องแชท, เสียเวลาถามไป-มาหาช่องว่าง. ร้านเล็บเจ็บสุด (duration แกว่ง 45 นาที–3 ชม. → คิวพังเมื่อจัดมือ)
- **ชนะที่ effort (เปิดเสร็จใช้ทันที), trust (ฟรีจริง), channel-fit (อยู่บน LINE)** — feature count ไม่ใช่ตัวตัดสิน
- *no-show benchmark (global เท่านั้น, ไม่มีฐานไทย): Zenoti วัดได้ salon ~3% / nail ~1% (เลือกเฉพาะร้านที่มีระบบแล้ว); aggregator อ้าง 10–20%; cancellation สูงกว่า no-show (8–16%). ตัวเลขไทยทั้งหมดเป็น vendor self-reported (QueueBooking −27% no-show/−41% คิวซ้ำ/−60% เวลาตอบแชท; SMS-kub −80% ลืมนัด) ใช้เป็น directional* [FACT (vendor) / unverified-for-Thailand]

---

## 5. Feature & capability matrix

✅ มี/แข็ง · ⚠️ partial · ❌ ไม่มี · **ตัวหนา** = แกนสำคัญต่อตลาดนี้

| Job/Capability | **Quego** | BeTask | FoxConnect | QueQ | GoWabi | Fresha(TH) | TimeTailor | SimplyBook | สมุด+LINE |
|---|---|---|---|---|---|---|---|---|---|
| Online self-booking (per-service/staff) | ✅ engine แกร่ง | ✅ | ✅ | ⚠️ คิวเฉย | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Live queue position "อีก N คิว"** | ✅ **ของจริง** | ⚠️ ticket | ❌ | ✅ (geofence) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **LINE-native booking entry** | ⚠️ **ยังไม่ LIFF** | ✅ rich-menu | ✅ LIFF | ❌ | ❌ | ❌ | ❌ | ✅ LIFF+bot | ⚠️ chat |
| **LINE reminders** | ✅ (ต้องเป็น reply เพื่อฟรี) | ✅ | ✅ | ❌ | ❌ | ⚠️ SMS | ❌ (SMS/WA) | ⚠️ LINE+SMS metered | manual |
| **LINE two-way actions** | ✅ | ⚠️ chat | ⚠️ chat | ❌ | ❌ | ❌ | ❌ | ⚠️ | manual |
| Reschedule self-serve | ✅ | ⚠️ | ✅ | ❌ | ⚠️ | ✅ | ✅ | ✅ | manual |
| **Multi-staff race-safe (DB overlap)** | ✅ **GiST** | ⚠️ **ไม่ documented** | ✅ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ❌ |
| Walk-in / QR self-check-in | ✅ | ⚠️ | ⚠️ | ⚠️ ticket | ❌ | ❌ | ❌ | ❌ | ❌ |
| No-show mitigation | ✅ call-ahead loop | ✅ PromptPay deposit | ⚠️ | ⚠️ | ⚠️ prepay | ✅ บัตร/มัดจำ | ✅ มัดจำ | ⚠️ | ❌ |
| **Loyalty (stamp/points)** | ✅ **ฝังในระบบ** | ✅ แต่ **แยก login** | ❌ | ❌ | ✅ cashback | ⚠️ add-on | ❌ | ⚠️ | ❌ |
| Referral (ผูกเบอร์) | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Now-serving display (ไม่ใช้ฮาร์ดแวร์) | ✅ | ❌ | ❌ | ⚠️ ขายจอ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Shop analytics + กำไรสุทธิ | ✅ + expenses | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ add-on | ✅ | ❌ |
| Near-me / geo discovery | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| Payments / deposit | ❌ (ข้อจำกัด) | ✅ PromptPay QR | ⚠️ | ⚠️ LINE Pay | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| ราคาฝั่งร้าน | **฿0 วันนี้** | ฿999–4,999/mo | ฿500/mo eff | ฿6k/mo+ | ฟรี+คอม | ฿350–525/mo | ฟรี+3.9% | $0–50/mo | ฿0 (+เวลา) |

**อ่าน matrix:** Quego เป็น **เจ้าเดียวที่เขียวพร้อมกันใน 4 แถวแกน** — live queue + LINE two-way + now-serving + loyalty-ฝัง. **2 ช่องแดงที่เจ็บ:** LINE-native booking entry (ไม่มี LIFF — BeTask/Fox/SimplyBook มี) และ PromptPay deposit (BeTask/Fresha/TimeTailor มี). ช่องอ่อนรอง: near-me/soonest-slot

---

## 6. Analysis (frameworks)

### SWOT
**Strengths** [FACT]: booking engine race-safe ต่อช่าง (เหนือ BeTask ตรงจุดที่เขาโฆษณาแต่ทำไม่ลึก); ชุด live-queue-concierge-บน-LINE ครบ (ไม่มีคู่แข่งไทยมีครบ); ฟรี + ไม่หักคอม; phone-as-identity → CRM/loyalty/referral โดยไม่ต้องมีบัญชี
**Weaknesses** [FACT]: เอกสาร/หน้าแรกตามหลังโค้ด (ขายไม่เป็น); **ไม่มี LIFF** → ยังมีกำแพง phone+PIN; ไม่มี near-me; supply ≈ 0 ร้าน (cold start); **"ฟรี" เปราะถ้าใช้ push** (§3); ไม่มี PromptPay deposit ที่ BeTask มี
**Opportunities**: ตลาดความงามไทยใหญ่/โต; Booksy ไม่อยู่ในไทย, QueQ ไม่ลงลึกซาลอน, FoxConnect ไม่มีคิวสด, BeTask engine ตื้น → **ช่องตรงกลาง (คิวสด+engine ลึก+ฟรีจริง) ว่างจริง**; no-show เป็น pain ทั้งวงการ
**Threats**: Fresha อยู่ในไทย+ทุนหนา; GoWabi ครอง discovery + PTT OR; **BeTask โตในสนามเดียวกัน ราคา ฿999 + มี deposit แล้ว**; LINE เปลี่ยน policy/ราคา push ได้ (เราพึ่ง channel เดียว); LINE-native ลอกง่าย (table-stakes)

### Porter's Five Forces
- **Rivalry: สูง** — BeTask (ตรงสุด), FoxConnect, GoWabi, Fresha. แต่ไม่มีใคร "คิวสด × engine ลึก × LINE × ฟรีจริง" ครบ
- **Buyer power (ร้าน): สูงมากตอน cold start** — ทางเลือกเยอะ (สมุดฟรี, BeTask ฿999, QueueBooking ฟรี 3 เดือน) → ต้องลด effort + พิสูจน์คุณค่าเร็ว
- **Buyer power (ลูกค้า): กลาง** — ฟรี ไปไหนก็ได้; ผูกด้วย loyalty/queue-status
- **Substitute: แรงสุด** — "สมุด + LINE chat" ฟรีและคุ้นเคย
- **New entrants: กลาง** — LINE booking ทำง่าย (เห็นชัดจากจำนวน vendor) แต่ **live-queue race-safe engine + loop ครบ ลอกช้า**

### JTBD + Kano
- **Must-have (✅ มีหมด):** จองออนไลน์, เตือนกันลืม, จัดการ walk-in
- **Performance (✅ loop ตอบโจทย์):** ลด no-show, เติมเก้าอี้ว่าง, ลดงานตอบแชท
- **Delighter (✅ คู่แข่งไทยไม่มี) → ดันสุด:** "ลูกค้าเห็นคิวสดบน LINE + กดกำลังมา/เลื่อนได้" + now-serving "ไม่ต้องซื้อจอ ฿20k+"
- **กับดัก Kano:** ไล่ payments/deposit แบบบัตร = ลงทุนหนักในสิ่งที่เป็น must-have ของ Fresha แต่ไม่ทำให้เรา wow (หมายเหตุ: PromptPay-QR deposit ต่างจาก card-on-file — เป็น fast-follow ได้ ไม่ใช่กับดัก ดู §8)

### Positioning map (X: appointment→live call-ahead · Y: web/app→ในLINE)
- **ขวา-บน (live + LINE) = Quego ★** — แทบว่าง
- ซ้าย-บน (appointment + LINE): BeTask, FoxConnect, QueueBooking, ZERVA, Loga, SimplyBook
- ขวา-ล่าง (live + ไม่ LINE): QueQ
- ซ้าย-ล่าง (appointment + web/app): Fresha, TimeTailor, GoWabi, Square
→ **Quego ยึดมุมที่ไม่มีคู่แข่งตรง** — แต่มุมซ้าย-บนแออัดขึ้นมาก ดังนั้นต้อง "ลึกเข้ามุมขวา-บน (คิวสด)" ไม่ใช่แข่ง LINE-native เฉย ๆ

### Moat
- **Network effects (สองด้าน):** อ่อน (supply=0) → concierge seeding ย่านเดียวให้หนา
- **Switching cost:** **แข็งขึ้นผ่าน phone-keyed CRM + loyalty ledger + stamp card** — ร้านย้ายออก = ทิ้งประวัติ/แต้ม. เร่งจุดนี้
- **Data:** queue/visit data ต่อเบอร์ → soonest-slot/busy-by-hour (คู่แข่งไม่มี queue data แบบเรา)
- **LINE lock-in:** ฝัง rich-menu/LIFF ของ Quego ใน OA ร้าน → ย้ายยาก. **ยังไม่เก็บเกี่ยว** (ไม่มี LIFF)
> **moat ที่ป้องกันได้จริง = (live-queue behavioral loop) + (engine depth) + (phone-keyed switching cost).** LINE-native ไม่ใช่ moat แล้ว; payments/discount ไม่ compound และเป็นสนามคนอื่น

---

## 7. Strengths to press · Weaknesses to fix · Traps

**กดให้แรง:** (1) live-queue + LINE call-ahead loop — delighter เดียวที่คู่แข่งไทยไม่มี (2) engine race-safe ต่อช่าง — wedge สาธิตได้เทียบ BeTask (3) ฟรีจริง + ไม่หักคอม + ไม่ต้องซื้อจอ (4) loyalty ฝัง + phone-keyed switching cost
**ต้องแก้:** (1) re-audit BACKLOG + reposition หน้าแรกด้วย proof ที่ ship แล้ว (2) **ออกแบบ messaging เป็น reply เพื่อรักษา "ฟรี"** (3) LIFF / rich-menu deep-link — ลด onboarding friction + เก็บ LINE lock-in (4) soonest-slot ranking
**กับดัก (อย่าทำ):** (1) payments card-on-file — สนาม Fresha/Booksy (2) สงครามส่วนลด/cashback — ฿0 monetization สู้ไม่ได้ + ทำลาย "ฟรี" (3) feature parity กับ Fresha/SimplyBook (4) native app — ทำลาย "ไม่ต้องโหลดแอป" (5) เคลม "ฟรี + เตือน LINE" โดยใช้ push (จะกลายเป็นไม่จริง)

---

## 8. Prioritised recommendations (ICE · now/next/later)

ICE = Impact × Confidence × Ease (1–10, คูณ /1000). Tag: **[Bet]** สร้างความได้เปรียบ · **[Table-stakes]** ต้องมีเสมอกัน · **[Trap]** อย่าทำ. ✅ on-stack · ⚠️ needs new infra

| # | ข้อเสนอ | I | C | E | **ICE** | Tag | Feasibility |
|---|---|---|---|---|---|---|---|
| R1 | **Re-audit BACKLOG/STRATEGY + reposition หน้าแรกด้วย proof ที่ ship แล้ว** + social proof real-data | 9 | 9 | 9 | **7.3** | [Bet] | ✅ copy/docs |
| R2 | **ออกแบบ LINE loop เป็น reply-first + วัด push/ร้าน/เดือน เป็น guardrail** (รักษา "ฟรี") | 9 | 8 | 7 | **5.0** | [Bet] | ✅ (อาจปรับ line/client) |
| R3 | **next-step checklist หลังสมัคร "สมัคร→เพิ่มบริการ→รับ QR"** (ปิดคอขวด 4/5 ร้านจองไม่ได้) | 8 | 8 | 9 | **5.8** | [Bet] | ✅ |
| R4 | **Concierge seeding ย่านเดียว 10–20 ร้าน** | 10 | 8 | 6 | **4.8** | [Table-stakes] cold-start | ✅ คน |
| R5 | **on-premise QR ดึงลูกค้าเดิมจองครั้งหน้า** (`/shop/share` มีแล้ว) | 7 | 8 | 8 | **4.5** | [Table-stakes] | ✅ |
| R6 | **glance bar หน้า dashboard ร้าน** (OPP-21, PRD พร้อม) | 6 | 8 | 7 | **3.4** | [Table-stakes] | ✅ |
| R7 | **LINE LIFF / rich-menu deep-link จองในLINE ไม่ login** (ปิด gap vs BeTask/Fox) | 8 | 6 | 4 | **1.9** | [Bet] moat | ⚠️ LIFF channel |
| R8 | **Soonest-slot ranking ใน discovery** (ใช้ slot-math ที่มี) | 6 | 7 | 6 | **2.5** | [Bet] | ✅ |
| R9 | **Real VIP + waitlist first-refusal** (OPP-13) | 5 | 7 | 6 | **2.1** | [Bet] | ✅ |
| R10 | **PromptPay-QR deposit (สลิป+verify) แบบ opt-in ต่อร้าน** — BeTask พิสูจน์แล้วว่าทำได้ไม่ต้อง card processor | 6 | 5 | 3 | **0.9** | [Bet] later | ⚠️ infra ใหม่ (QR+สลิป) |
| R11 | Near-me / geo discovery | 6 | 6 | 4 | **1.4** | [Bet] | ⚠️ lat/lng + UX |
| R12 | Payments card-on-file · Discount/cashback wallet | — | — | — | **อย่าทำ** | **[Trap]** | ⚠️/✅-แต่ไม่ควร |

**Now (4–6 สัปดาห์):** R1 → R2 → R3 → R4 (+R5, R6). ทั้งหมด on-stack/คน, ICE สูง, ตรง activation. **R2 ขึ้นมาเป็นลำดับต้นเพราะมันคือเงื่อนไขที่ทำให้ "ฟรี" จริง** — ถ้าพลาด positioning ทั้งก้อนพัง
**Next (1–2 เดือน):** R7 (LIFF — เริ่ม spike, Impact moat สูงแม้ ease ต่ำ), R8 (soonest-slot), R9 (VIP)
**Later (เมื่อมี ~20 ร้าน + booking จริง):** R10 (PromptPay deposit ถ้า no-show เป็นปัญหาจริง), R11 (near-me), ตัดสิน pricing บน data จริง (anchor: FoxConnect ฿500/mo eff, BeTask ฿999/mo — framing "Founding Shops 100 ร้านแรกฟรีถาวร")
**What NOT to build:** card-on-file, discount/cashback war, feature parity, native app, no-show strike tracking (retired), pause-intake/geofence (out of scope)

---

## 9. Strategic direction & the wedge (sharpened)

**Where to play:** ร้านความงาม/สุขภาพไทย 1–5 ช่าง ที่วันนี้ใช้ **สมุด + LINE chat** — เอาชนะ substitute นั้นก่อน หนาแน่นในย่านเดียว (density > spread)
**How to win:** ขาย **"คิวออนไลน์ที่ลูกค้าเห็นจริงบน LINE — ฟรีจริง เปิดเสร็จใช้ทันที"** โดยมีของจริงหนุน. ลำดับคุณค่า: ลดงานตอบแชท+เติมคิว → ลด no-show ด้วย LINE loop → เริ่มฟรีไม่มีกำแพง → ใช้ผ่าน LINE ที่ทีมใช้อยู่. **นำด้วยเวลา/งานที่ลดได้ ไม่นำด้วยราคา**
**Why defensible:** wedge = (คิวสด + engine ลึก + loyalty ฝัง + ฟรีจริง-ผ่าน-reply) — คู่แข่งลอกได้ทีละชิ้น แต่ลอก *การประกอบกัน* + race-safe engine + queue-data ต่อเบอร์ ได้ช้า. **เลิกพึ่ง "LINE-native" เป็นจุดขาย (table-stakes แล้ว) — ขาย "คิวสด" เป็นหัวหอก**

---

## 10. Risks & assumptions ที่ต้อง validate

| สมมติฐาน/ความเสี่ยง | ระดับ | การทดลองที่ถูกสุด |
|---|---|---|
| ร้านมองว่า "ลูกค้าเห็นคิวสด" มีค่าพอจะสมัคร | สูง | คุยร้านจริง 10–20 ร้านตอน seeding (R4) — วัด activation จริง |
| **LINE loop อยู่ใต้ 300 push/เดือน/ร้าน ได้จริง (ไม่งั้น "ฟรี" พัง)** | **สูง** | จำลอง push/ร้าน/เดือน จาก booking volume จริง; ออกแบบ reply-first (R2) แล้ววัด |
| LIFF ลด onboarding friction จริงและคุ้ม effort | สูง | ก่อนสร้าง LIFF: ทดสอบ rich-menu deep-link กับ 5 ร้าน ดู conversion |
| Substitute (สมุด+LINE) แพ้เราเรื่อง effort | สูง | onboarding time-trial: จับเวลาตั้งร้านจนจองได้ |
| no-show เป็นปัญหาพอจะต้องมี deposit (R10) | กลาง | วัด no-show จริงหลังมีร้าน ก่อนลงทุน PromptPay flow (ไม่มีฐานไทย — ต้องวัดเอง) |
| ราคา anchor ฿500–999/mo | กลาง | ทดสอบ willingness-to-pay ตอนใกล้ liquidity ไม่ใช่ตอนนี้ |
| BeTask/Fresha จะไม่ทับเราตรง ๆ เร็ว | กลาง | ติดตามทุกไตรมาส; ถ้า BeTask เพิ่ม live queue หรือ engine ลึกขึ้น → เร่ง R7+R9 |

---

## 11. Sources (accessed 2026-06-21)

**โค้ดเรา (verified):** `src/lib/line/client.ts`, `src/lib/booking/queue-position.ts` · `slot-math.ts`, `src/lib/services/{shop-line,line-linking,promotions,waitlist,reviews,insights,expenses,customer-crm}.ts`, `src/app/bookings/[id]/reschedule/`, `src/app/shops/[id]/walk-in/`, `src/app/shop/(authed)/`
**คู่แข่ง (verified live):**
- BeTask: betaskthai.com/be_linked, /transform_hair_salon, /salon-queue-system, /queue-booking-app-guide; TikTok @betaskthai (caption); FB betaskthai (no-GP)
- FoxConnect: foxconnect.app/pricing, /features, /line-booking-system · iPlan: clutch.co/profile/iplan-digital-co, iplandigital.co.th (= agency on FoxConnect)
- QueQ: apps.apple.com, play.google.com, crunchbase.com (Series A US$2.8M) · GoWabi: gowabi.com, dealstreetasia.com (PTT OR US$4M)
- Fresha: fresha.com/pricing, /lp/en/th-bangkok · TimeTailor: timetailor.com/pricing, /country-availability/salon-software-thailand (no LINE) · Booksy: biz.booksy.com/pricing, help.booksy.com (ไม่มีในไทย)
- SimplyBook.me: simplybook.me/en/pricing, help.simplybook.me/LINE_LIFF_Custom_Feature, /Line_bot_custom_feature · Square: squareup.com/us/en/appointments/pricing, nerdwallet.com (no TH/LINE)
- 3rd-party LINE booking: queuebooking.com, zwiz.app/th/zerva + blog.zwiz.app, blog.loga.app/booking, fastwork.co/chatbot/queue, mequeue.app/blog
**LINE platform (official, verified):**
- ราคา/quota: lineforbusiness.com/th/service/line-oa-features (Free 0/300, Basic 1,280/15k, Pro 1,780/35k, +7% VAT); blog.cresclab.com/th/line-oa-price (dated 30 Jan 2026, ยืนยัน Free 500→300)
- broadcast vs reply: developers.line.biz/en/docs/messaging-api/pricing (push/multicast/broadcast/narrowcast = นับต่อผู้รับ; reply = ฟรี)
- native booking: lineforbusiness.com/th/service/myshop (e-commerce, ไม่มี booking), /line-oa-features (ไม่มี native booking)
**substitute / no-show benchmark:** mequeue.app/blog, iplandigital.co.th, cipher.co.th, comsiam.com (Excel), sherwepos.com (nails/massage); zenoti.com/thecheckin/beauty-wellness-industry-statistics-2025 + heygoldie.com/blog/how-to-calculate-salon-no-show-rate (global, directional)

---

## 12. Confidence & gaps

**HIGH:** capability เราในโค้ด; ราคา/ฟีเจอร์ BeTask, FoxConnect, Fresha, TimeTailor, SimplyBook, Square; LINE OA 2026 pricing + broadcast/reply metering; LINE ไม่มี native booking; SimplyBook มี LINE จริง; manual-workflow mechanics (LINE chat + สมุด + Excel)
**UNVERIFIED (ทำเครื่องหมายตามจุด):** GoWabi commission % + cashback 2.5%; QueQ ราคาธุรกิจ 2026 + 16M users; FoxConnect reviews/ทุน/ว่ามี loyalty; BeTask annual pricing + ความลึก per-staff จริง (เอกสารเงียบ — ถือว่ายังไม่พิสูจน์); LINE OA add-on prices; **ไม่มี absolute no-show baseline ของไทย** (ตัวเลขไทยทั้งหมด vendor self-reported)
**CORRECTED จาก first pass:** iPlan = เอเจนซี ไม่ใช่ product; Catalogspa = ผู้ผลิตอุปกรณ์สปา ไม่ใช่คู่แข่ง (ตัดออก); SimplyBook มี LINE (สมมติฐานเดิมผิด); "LINE-native" = table-stakes ไม่ใช่ moat
**ช่องที่ปิดไม่ได้ (เครื่องมือจำกัด):** เสียงเจ้าของร้าน/ลูกค้า first-person จาก Pantip/Lemon8 (JS-gated, ไม่มี browser ในเซสชัน) — ต้องรันจากเซสชันที่มี browser extension
