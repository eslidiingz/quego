# PRD: แถบสรุปสถานการณ์หน้า Dashboard ร้าน (Dashboard at-a-glance bar) — OPP-21

> Lean PRD. เขียนโดย `product-owner` 2026-06-14 หลัง verify field จริงใน
> `src/lib/services/bookings.ts`, `src/lib/booking/slot-math.ts`,
> `src/lib/services/waitlist.ts`.

## 1. ปัญหา & เป้าหมาย

หน้า `/shop` (`src/app/shop/(authed)/page.tsx`) วันนี้คือ "today list + ปุ่ม
เสร็จสิ้น/ยกเลิก" ที่ดี แต่ยัง **ไม่ใช่ command center**: มันบอก *รายการ* แต่ไม่บอก
*สถานการณ์*. เจ้าของร้านเปิดหน้านี้ตอนเช้า/ระหว่างวันแล้วยังตอบคำถามเหล่านี้ไม่ได้ใน
ทันที:

- "วันนี้ได้เงินเท่าไหร่แล้ว / เต็มหรือยัง / เหลือที่ว่างกี่คิว"
- "ต้องเรียกใครต่อ — คิวถัดไปคือใคร และมีใครเลยเวลามาแล้วบ้าง"
- "ลูกค้าคนนี้กด 'กำลังมา' ใน LINE แล้วหรือยัง" (จะได้ไม่รีบยกเลิกเป็น no-show)
- "มีคนรอคิวว่าง (waitlist) ของวันนี้กี่คนที่ผมเปิดคิวให้ได้"

ข้อมูลเกือบทั้งหมดที่ขาด **มีอยู่ใน schema/service แล้ว** — งานนี้คือ assemble เป็น
at-a-glance bar ไม่ใช่สร้าง engine ใหม่.

- **Persona:** เจ้าของร้าน (shop owner) — มุมมองหน้าแรกหลัง login.
- **Job-to-be-done:** "เปิดหน้านี้แล้วรู้สถานการณ์ร้านวันนี้ใน 3 วินาที และรู้ว่า
  ต้องลงมือทำอะไรต่อ (เรียกคิวถัดไป / เปิดคิวให้คนรอ)."
- **Success metric:** ลด time-to-first-action (เรียกคิว/เปิดคิว) ต่อ session;
  proxy ที่วัดได้ = สัดส่วน session ที่ owner กด complete/cancel/เปิด waitlist จาก
  หน้า dashboard โดยตรง (แทนที่จะต้องเข้า `/shop/bookings`).

## 2. ขอบเขต

**In scope (Q1–Q4):**

- **Q1** แถบสรุปวันนี้ 4 ค่า: รอรับบริการ / เสร็จสิ้น (+ **ยอดเงินวันนี้**) /
  ยกเลิก / **ที่ว่างเหลือวันนี้**.
- **Q2** ไฮไลต์ "คิวถัดไป" (confirmed ที่ใกล้ `now` ที่สุดและยังไม่เลยเวลา) +
  ป้าย **"เลยเวลา X นาที"** บนแถวที่ `slotTime < now`.
- **Q3** ป้าย **"กำลังมา ✓"** บนแถว confirmed ที่ลูกค้ากดยืนยันใน LINE
  (`coming_ack_at` ไม่เป็น null).
- **Q4** การ์ด/badge **"มี N คนรอคิวว่างวันนี้"** + ลิงก์ไปดู (waitlist ของวันนี้
  ของร้าน).

**Out of scope (อย่าทำในงานนี้):**

- ❌ **VIP จริง / จัดลำดับ-บัมพ์คิว** — นั่นคือ **OPP-13** (ต้อง migration `is_vip`
  + priority logic) ทำแยก.
- ❌ Now-serving display เต็มจอ — **OPP-07 มีแล้ว** ที่ `/shop/display`. งานนี้แค่
  glance บน dashboard ไม่ทำซ้ำ (จะเพิ่มลิงก์ "เปิดจอแสดงคิว" ได้ แต่ optional).
- ❌ หน้า analytics เชิงลึก (busy-by-hour, utilization) — **OPP-19 มีแล้ว** ที่
  `/shop/insights`. ยอดเงินใน Q1 เป็นแค่ตัวเลข glance ของ "วันนี้" ไม่ใช่รายงาน.
- ❌ เปลี่ยน logic การเรียง/กรอง booking ที่มีอยู่ (smart sort ใช้ของเดิม).
- ❌ Waitlist engine / การ offer slot — **OPP-05 มีแล้ว**. Q4 แค่ "นับ + แสดง".
- ❌ Polling/refresh แบบสด — หน้านี้เป็น `force-dynamic` (reload ได้ข้อมูลใหม่);
  ไม่เพิ่ม poll loop ใหม่ในงานนี้ (live notifier มีที่ layout อยู่แล้ว).

## 3. User stories

- ในฐานะเจ้าของร้าน ฉันต้องการเห็น **ยอดเงินวันนี้และที่ว่างที่เหลือ** บนหน้าแรก
  เพื่อรู้ว่าวันนี้เป็นยังไงและควรดันคิวเพิ่มไหม โดยไม่ต้องเปิดหน้า insights.
- ในฐานะเจ้าของร้าน ฉันต้องการเห็น **คิวถัดไปเด่นชัด** และรู้ว่าใคร **เลยเวลา** มาแล้ว
  เพื่อเรียกคิวได้ถูกคนทันที.
- ในฐานะเจ้าของร้าน ฉันต้องการรู้ว่าลูกค้า **กด "กำลังมา" แล้วหรือยัง** เพื่อจะได้ไม่
  รีบยกเลิกคนที่กำลังเดินทางมา.
- ในฐานะเจ้าของร้าน ฉันต้องการรู้ว่า **มีกี่คนรอคิวว่างวันนี้** เพื่อจะ proactive
  เปิดคิว/ยกเลิกคิวที่ไม่มาให้คนที่รออยู่.

## 4. Flow & UX (mobile 375 first)

ลำดับบนหน้า `/shop` (บนลงล่าง):

1. `PageHeader` (เดิม).
2. **(ใหม่ Q4)** ถ้า `waitingCount > 0`: การ์ดบาง ๆ เหนือ section
   "การจองวันนี้" — `"มี {N} คนรอคิวว่างวันนี้"` + ลิงก์ `ดูรายชื่อ →`
   (ถ้ายังไม่มีหน้า shop-waitlist ให้ลิงก์ไป `/shop/bookings?view=today` ชั่วคราว
   หรือ flag เป็น follow-up — ดู §9). ถ้า `N = 0` ไม่แสดงการ์ดเลย (ไม่รก).
3. **(ปรับ Q1)** แถบสรุปเปลี่ยนจาก 3 → จัดวาง 3 filter tiles เดิม **คงไว้**
   (รอ/เสร็จ/ยกเลิก เป็น filter ได้เหมือนเดิม) + เพิ่ม **แถบ glance** ด้านบนหรือ
   ในการ์ดเดียวกันที่โชว์ **"ยอดวันนี้ ฿{X}"** และ **"ที่ว่างเหลือ {S}"**
   (สองค่านี้เป็น read-only stat ไม่ใช่ filter — แยก visual จาก 3 tiles ที่กดได้
   เพื่อไม่สับสนเรื่อง affordance).
4. **(ปรับ Q2)** แถวแรกของ list (ถ้าเป็น confirmed และยังไม่เลยเวลา) render เป็น
   **"คิวถัดไป"** เด่นกว่าแถวอื่น (เช่น ring/badge "ถัดไป"). แถวที่ `slotTime < now`
   ได้ป้าย **"เลยเวลา {X} นาที"**.
5. **(ปรับ Q3)** แถว confirmed ที่ `comingAckAt != null` ได้ป้าย **"กำลังมา ✓"**.

ตัวอย่าง copy ไทย:
- `ยอดวันนี้ ฿2,400` · `ที่ว่างเหลือ 6 คิว`
- `ถัดไป` (badge บนคิวถัดไป)
- `เลยเวลา 12 นาที`
- `กำลังมา ✓`
- `มี 3 คนรอคิวว่างวันนี้` · `ดูรายชื่อ →`

ปฏิบัติตาม convention โปรเจกต์: ป้ายใช้ `Chip`/inline pill เดิม, ปุ่มคู่เท่ากัน,
ฟอนต์ Anuphan/Sora, ไม่ใช้ native confirm/alert (ConfirmDialog ของ action เดิม
ไม่เปลี่ยน).

## 5. Data & services

### มีอยู่แล้ว — ใช้ได้เลย (verified)

| ข้อมูล | แหล่ง | สถานะ |
|---|---|---|
| `servicePrice` ต่อ booking (Q1 ยอดเงิน) | `BookingListItem.servicePrice` (`bookings.ts:141`), select มี `service_price` (`bookings.ts:991`) | ✅ มีในหน้านี้แล้ว — รวม `status==='completed'` ฝั่ง page |
| ที่ว่างเหลือวันนี้ (Q1) | `getBookingContext()` คืน `BookingContext` (`slot-math.ts:73`) — มี `capacity`, `bookedIntervals`, `hours`, `nowTimeHHMM`; หน้านี้โหลด `context` อยู่แล้ว (`page.tsx:74-77`) | ✅ context โหลดแล้ว — ต้องคำนวณ "remaining slots วันนี้" ด้วย pure slot-math (ดู §5 data task) |
| `slotTime` + `now` (Q2 เลยเวลา/ถัดไป) | `BookingListItem.slotTime`; `getBangkokNow().timeHHMM` ใช้อยู่แล้ว (`page.tsx:87`) | ✅ มีครบ |
| smart sort (confirmed→ใกล้ now ขึ้นบน) | logic ใน `page.tsx:89-106` | ✅ คงไว้ |

### ⚠️ ต้องเพิ่ม data work (สำคัญ — flag)

| ข้อมูล | ที่ขาด | งานที่ต้องทำ |
|---|---|---|
| **Q3 `comingAckAt`** | คอลัมน์ `bookings.coming_ack_at` **มีในตารางแล้ว** (เขียนที่ `bookings.ts:1308`) แต่ **ไม่ได้ select เข้า `listBookingsByShop`** (select ที่ `bookings.ts:990-993` ไม่มี `coming_ack_at`) และ **ไม่มีใน type `BookingListItem`** (`bookings.ts:133-149`) | (a) เพิ่ม `coming_ack_at` ใน 3 select string ของ booking-list reads, (b) เพิ่ม `comingAckAt: string \| null` ใน `BookingListItem` + map ใน `mapRow`. **ไม่ต้อง migration** — คอลัมน์มีอยู่แล้ว |
| **Q4 ตัวนับ waitlist ของร้าน** | `waitlist.ts` มีแต่ฟังก์ชัน **customer-keyed by phone** (`countOpenWaitlistSlots(phone)`, `listWaitlistForCustomer(phone)`); **ไม่มี shop-keyed count** เลย | เพิ่ม service ใหม่ `countWaitingForShopToday(shopId)` ใน `waitlist.ts` (นับ `waitlist_entries` ที่ `shop_id = shopId`, `requested_date = getBangkokToday()`, `status` ∈ active). คืน 0 เมื่อ error (fail closed) ตาม pattern เดิม. **ไม่ต้อง migration** — ตาราง `waitlist_entries` มีอยู่แล้ว |

### ไฟล์ที่คาดว่าจะแตะ

- `src/app/shop/(authed)/page.tsx` — เพิ่ม glance bar (Q1), waitlist card (Q4),
  คำนวณ remaining slots + ยอดเงิน, ส่ง props เพิ่มลง row; เรียก
  `countWaitingForShopToday(session.shopId)` ใน `Promise.all` ที่มีอยู่.
- `src/app/shop/(authed)/TodayBookingRow.tsx` — ป้าย "ถัดไป" / "เลยเวลา X นาที"
  (Q2) / "กำลังมา ✓" (Q3). รับ `now`, `isNext`, `comingAckAt` ผ่าน props
  (row เป็น client component แต่ logic เวลาคำนวณฝั่ง server แล้วส่งลงมาได้).
- `src/lib/services/bookings.ts` — เพิ่ม `coming_ack_at` ใน select + `BookingListItem`
  + `mapRow` (Q3 data task).
- `src/lib/services/waitlist.ts` — `countWaitingForShopToday(shopId)` (Q4 data task).
- (อาจ) `src/lib/booking/` — helper pure คำนวณ "remaining bookable slots วันนี้"
  จาก `BookingContext` ถ้ายังไม่มี (ใช้ `generateSlots` + `isSlotTaken` ที่มีอยู่
  ใน slot-math; verify ว่า reuse ได้ ก่อนเขียนใหม่).

### Authz / ownership

`session.shopId` จาก `requireShopSession()` เป็น boundary เดียว — ทุก service
ใหม่ filter `.eq("shop_id", shopId)` ตาม convention (เหมือน `listBookingsByShop`).
ไม่มี input จาก client ที่เชื่อได้.

## 6. Realtime/LINE

- **ไม่มี LINE touchpoint ใหม่** ในงานนี้ (Q3 อ่าน `coming_ack_at` ที่ OPP-03/04
  เขียนไว้แล้ว; ไม่ส่ง push ใหม่).
- **ไม่เพิ่ม poll loop ใหม่** — `/shop` เป็น `force-dynamic` (reload = ข้อมูลสด);
  live new-booking notifier มีที่ `layout.tsx` (`ShopNotifier`) อยู่แล้ว. ตัวเลข
  glance bar refresh ตาม page load / navigation.

## 7. Edge cases

- **ร้านไม่มี service active** → `getBookingContext()` คืน `null` (หน้านี้ guard
  แล้วที่ `page.tsx:136`): glance "ที่ว่างเหลือ" ต้องซ่อน/แสดง "—" ไม่ throw.
- **ปิดร้านวันนี้ (no business hours วันนี้)** → remaining slots = 0; แสดง
  "ปิดวันนี้" หรือ 0 อย่างชัด ไม่ใช่ค่าเพี้ยน.
- **`servicePrice = null`** (booking เก่า/walk-in ไม่มีราคา) → นับเป็น ฿0 ในยอดรวม,
  ไม่ทำให้ผลรวมเป็น NaN.
- **คิวถัดไปไม่มี** (ทุก confirmed เลยเวลาหมด หรือไม่มี confirmed) → ไม่แสดง badge
  "ถัดไป"; ไม่เลือกแถว completed/cancelled มาเป็น "ถัดไป".
- **Waitlist count error** → คืน 0 → ไม่แสดงการ์ด (fail closed, เงียบ).
- **เลยเวลาจำนวนลบ** (slot ในอนาคต) → ไม่แสดงป้าย "เลยเวลา".
- **`coming_ack_at` มีบน booking ที่ไม่ใช่ confirmed** → แสดงป้ายเฉพาะแถว confirmed
  เท่านั้น (สอดคล้องกับ action zone เดิมที่โชว์เฉพาะ confirmed).

## 8. Acceptance criteria

**Q1 — แถบสรุป + ยอดเงิน + ที่ว่างเหลือ**
- [ ] หน้า `/shop` แสดง "ยอดวันนี้ ฿X" โดย X = ผลรวม `servicePrice` ของ booking
      วันนี้ที่ `status === 'completed'` (null → 0); ฟอร์แมตเลขไทย/มีคอมมา.
- [ ] แสดง "ที่ว่างเหลือ {S}" โดย S = จำนวน slot วันนี้ที่ยังจองได้ (slot >= now,
      capacity ยังไม่เต็ม) คำนวณจาก `BookingContext` ด้วย slot-math เดิม.
- [ ] 3 filter tiles เดิม (รอ/เสร็จ/ยกเลิก) ยังกดกรองได้เหมือนเดิม; ค่ายอดเงิน/
      ที่ว่างเป็น read-only (ไม่ใช่ลิงก์กรอง) และแยก affordance ชัด.
- [ ] context = null → glance "ที่ว่าง" แสดง "—" และหน้าไม่ error.

**Q2 — คิวถัดไป + เลยเวลา**
- [ ] booking confirmed ที่ใกล้ now ที่สุดและ `slotTime >= now` ได้ป้าย/treatment
      "ถัดไป"; ถ้าไม่มี ก็ไม่มีแถวไหนได้ป้ายนี้.
- [ ] booking confirmed ที่ `slotTime < now` แสดง "เลยเวลา {X} นาที" โดย X =
      ส่วนต่างนาที (now − slotTime) ใน ICT; ไม่แสดงกับ completed/cancelled.

**Q3 — กำลังมา ✓**
- [ ] `coming_ack_at` ถูก select เข้า `listBookingsByShop` และมีใน `BookingListItem`.
- [ ] แถว confirmed ที่ `comingAckAt != null` แสดงป้าย "กำลังมา ✓"; null → ไม่แสดง.
- [ ] ไม่กระทบ booking reads อื่น (build/type ผ่าน).

**Q4 — waitlist รอ N คน**
- [ ] มี service `countWaitingForShopToday(shopId)` ที่นับ `waitlist_entries`
      ของร้านนั้น วันนี้ สถานะ active; error → 0.
- [ ] N > 0 → แสดงการ์ด "มี {N} คนรอคิวว่างวันนี้" + ลิงก์; N = 0 → ไม่แสดงการ์ด.
- [ ] ฟังก์ชันนี้ filter ด้วย `shop_id` จาก session เท่านั้น (ไม่รั่วข้ามร้าน).

**ทั่วไป**
- [ ] mobile 375 ไม่ล้น/ไม่ตัดบรรทัด; ปุ่ม action เดิม (เสร็จสิ้น/ยกเลิก) ไม่เปลี่ยน
      พฤติกรรม.
- [ ] `pnpm lint` + `pnpm build` ผ่าน; ถ้าเพิ่ม pure helper ใน slot-math → มี unit
      test ตาม pattern เดิม.

## 9. Risks & open Qs

- **Q4 ปลายทางลิงก์:** ยังไม่มีหน้า "shop waitlist list". MVP ลิงก์ไปที่ใด? —
  เสนอ: ลิงก์ไป `/shop/bookings?view=today` ชั่วคราว หรือ scope หน้า
  `/shop/waitlist` เป็น follow-up เล็ก ๆ (ไม่อยู่ใน OPP-21 นี้). **ต้องตัดสินใจ
  ก่อนเริ่ม.**
- **"ที่ว่างเหลือ" นิยาม:** นับ slot ที่ว่าง "ตั้งแต่ now ถึงปิดร้าน" ของทุกบริการ
  รวม หรือของบริการ default? — เสนอ: นับ "จำนวน slot-line ที่ยังรับได้จนปิดร้าน"
  แบบ capacity-aware ตาม slot-math; ระบุให้ engineer ใช้ helper เดียวกับ picker
  เพื่อไม่ให้ตัวเลขขัดกับ booking form.
- **Visual ของ glance vs filter tiles:** ต้องไม่ให้ owner เข้าใจผิดว่ายอดเงิน/
  ที่ว่างกดกรองได้ — ส่งให้ ux-ui-designer ที่ดูคู่ขนานช่วย treatment.

## 10. Handoff

- **ขนาดรวม:** **M** (เล็กค่อนกลาง) — UI assembly เป็นหลัก + 2 data task เล็ก
  (เพิ่ม `coming_ack_at` ใน select/type, เพิ่ม `countWaitingForShopToday`).
  ไม่มี migration, ไม่มี LINE/infra ใหม่.
- **แยกย่อย:** Q1+Q2 (UI ล้วน, ใช้ data ที่มี) = S, ทำก่อนได้; Q3 = data task เล็ก
  + ป้าย; Q4 = service ใหม่ + การ์ด.
- **Implementing agent:** `feature-dev` (solo) — แตะไฟล์ disjoint, logic ตรงไปตรงมา.
  ถ้าต้องการ helper slot-math ใหม่ ให้ `architect` ตรวจ reuse ก่อนเขียน.
- **คู่ขนาน:** ux-ui-designer ดู treatment glance bar / next-queue highlight.
