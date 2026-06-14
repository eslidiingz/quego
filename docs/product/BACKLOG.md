# queva — Product Backlog

> Living, prioritized backlog maintained by the **`product-owner`** agent.
> First pass: 2026-06-06, from a codebase audit (5 persona areas) + web
> competitor research (QueQ, GoWabi, TimeTailor, Fresha/Booksy, LINE-native TH
> vendors, Square/SimplyBook.me, Yelp Waitlist/OpenTable/TablesReady).
>
> To regenerate or extend: invoke `@product-owner`. Each item is feasible on the
> current stack (Next 16 + Supabase service-role + **polling** realtime + LINE +
> phone-as-identity, **no payment processor**). Items needing new infra are
> flagged.

## Product in one paragraph

queva is a Thai booking + **virtual-queue concierge** for beauty/wellness ร้าน
(barber/salon/nail/spa), 3 personas. The **booking engine is the crown jewel**
(per-service durations, parallel staff capacity, GiST overlap, staff↔service,
shared slot-math). The **gap** is the entire customer-facing realtime + LINE
loop: "LINE notifications" is marketing copy with **no API**, there is **no live
queue position, no waitlist, no reschedule, no two-way actions**, **VIP is a
color token**, and there is **no near-me**. The bet:
own **beauty/wellness × live queue** — a niche QueQ (treats a barber like a bank)
and GoWabi/Fresha (appointment-slot-centric) leave open.

> **Explicitly out of scope (do not re-propose):** no-show tracking / "ไม่มาตามนัด"
> strikes (built then deliberately retired 2026-06-07 — shops just cancel
> no-shows at their discretion), and pause-intake "หยุดรับคิว" + geofence.

## ✅ Shipped

- **2026-06-06 → 06-09:** OPP-01, OPP-02, OPP-03, OPP-04, OPP-10, OPP-11a,
  OPP-12, OPP-18a (filter), OPP-19, + LINE connect (shop/customer) +
  cancellation notifications.
- **2026-06-10 (parallel batch):**
  - **OPP-07** — full-screen now-serving "กำลังเรียกคิว" kiosk display at
    `/shop/display` (chrome-free, polls the same source as the customer queue
    view; "เรียกคิวถัดไป" advances via `updateBookingStatus`).
  - **OPP-14** — CRM-lite: per-shop private customer note + cross-booking visit
    history at `/shop/customers/[phone]` (`shop_customer_notes` table).
  - **OPP-15** — informational loyalty points (1 แต้ม/completed booking, accrued
    via the `updateBookingStatus` completion hook) + referral with a 3-day hold
    (lazy release); customer page `/me/credit`. Tables `loyalty_ledger`,
    `referrals`, `customers.referral_code`.
  - **OPP-18** — admin audit log at `/admin/audit` (`admin_audit_logs`),
    `writeAuditLog()` from every admin mutation. **Roles/RBAC still pending** —
    only the audit-log half of OPP-18 shipped.
- **2026-06-10 (OPP-05):**
  - **OPP-05** — customer waitlist for a fully-booked (shop, service, date).
    Surfaces in the booking form's full-day state (full date chips are now
    tappable → a "แจ้งเตือนเมื่อมีคิวว่าง" panel) and at `/me/waitlist`. On
    cancel / reschedule-away the freed slot is offered over LINE to the oldest
    eligible waitlister — availability re-verified with the SAME slot-math the
    picker uses, so a freed staff-X line never falsely pings a service that needs
    staff Y. The push is a **head start** (a "จองเลย" deep link into the normal,
    race-safe booking flow), **not an exclusive hold**; "roll on if unclaimed" is
    event-driven (the next cancellation re-offers, gated by a 15-min claim
    window) so it stays on the project's polling/`after()` rails with no cron.
    New `waitlist_entries` table; `waitlist.ts` service + pure
    `lib/waitlist/eligibility.ts` (unit-tested).

> **Still open:** OPP-08 (QR walk-in), OPP-09 (LIFF), OPP-13 (real VIP), OPP-17
> (OTP — deferred, needs a messaging channel), OPP-18 roles, OPP-20
> (packages/group). See the priority tables + detail sections below.

---

## Priority — now / next / later

Sorted for sequencing. **Impact** = high/med/low · **Effort** = S/M/L.

### ▶ NOW — quick wins (high leverage, mostly wiring existing state)

| ID | ฟีเจอร์ | Persona | Impact | Effort | หมวด |
|----|---------|---------|--------|--------|------|
| OPP-21 | แถบสรุปสถานการณ์หน้า dashboard ร้าน (glance bar) | shop | high | M | ops-efficiency |
| OPP-10 | Rich-menu / ลิงก์จองต่อร้าน + QR | shop | med | S | discovery |
| OPP-18a | ค้นหา/กรอง/เรียงรายการร้าน (admin) | admin | med | M | ops-efficiency |
| OPP-11a | ตัวเลือก "พนักงานคนไหนก็ได้ = เร็วกว่า" | customer | med | M | discovery |

### ▶ NEXT — the concierge loop + table-stakes (the reason to exist)

| ID | ฟีเจอร์ | Persona | Impact | Effort | หมวด |
|----|---------|---------|--------|--------|------|
| OPP-01 | หน้าติดตามคิวสด "อีก N คิวก่อนถึงคุณ" | customer | high | M | retention |
| OPP-02 | แจ้งเตือนผ่าน LINE (ยืนยัน/ใกล้ถึง/ถึงคิว) | platform | high | L | retention |
| OPP-03 | ปุ่มโต้ตอบใน LINE (กำลังมา/เลื่อน/ยกเลิก) | customer | high | M | retention |
| OPP-04 | เลื่อน/ยกเลิกการจองด้วยตนเอง | customer | high | M | conversion |
| OPP-05 | รายชื่อรอคิว (waitlist) + แจ้งเมื่อว่าง | customer | high | M | conversion |
| OPP-17 | Rate-limit + OTP ยืนยันเบอร์ (login) | platform | high | M | trust |
| OPP-08 | QR เช็คอินหน้าร้าน (walk-in self-join) | shop | high | M | discovery |
| OPP-12 | รีวิวหลังใช้บริการ (เฉพาะที่เสร็จสิ้น) | customer | med | M | trust |
| OPP-13 | VIP จริง + จัดลำดับ/บัมพ์คิว | shop | med | M | retention |

### ▶ LATER — bigger bets & LTV

| ID | ฟีเจอร์ | Persona | Impact | Effort | หมวด |
|----|---------|---------|--------|--------|------|
| OPP-09 | จองผ่าน LINE LIFF/Mini App (ไม่ต้องล็อกอิน) | customer | high | L | discovery |
| OPP-07 | จอแสดงคิว "กำลังเรียก" หน้าร้าน (ไม่ใช้ฮาร์ดแวร์) | shop | med | M | ops-efficiency |
| OPP-14 | CRM-lite: ประวัติการมา + โน้ตลูกค้า | shop | med | M | retention |
| OPP-15 | เครดิตสะสม + ชวนเพื่อน (ผูกเบอร์) | platform | med | M | monetization |
| OPP-19 | แดชบอร์ดสรุปร้าน (peak/fill/staff) | shop | med | M | ops-efficiency |
| OPP-20 | แพ็กเกจบริการ + จองเป็นกลุ่ม | customer | med | L | monetization |

---

## North-star bets

1. **Close the customer-facing realtime loop** — live "อีก N คิวก่อนถึงคุณ"
   (OPP-01) → real LINE sequence (OPP-02) → two-way actions (OPP-03). The
   under-occupied intersection of *beauty/wellness × live queue*. Lead with
   time/zero-wait, never price.
2. **Make LINE the entire front door & feedback channel** — LIFF/Mini App
   (OPP-09) killing phone+PIN friction, per-shop rich menus (OPP-10), reminders,
   "you're next", waitlist offers, reviews, and a "how long's the wait?" bot.
   Competitors lean on SMS/cards and surfaced **no LINE integration** — this is
   where we out-Thai everyone.
3. **Tool-first, marketplace-second** (Fresha/Booksy playbook) — make the free
   shop tool the best for daily ops (call-next, real VIP, walk-in
   QR, now-serving display, CRM-lite), then grow discovery (reviews, near-me,
   soonest-slot) on real queue inventory. Deal-light counter to GoWabi; price
   against the ฿999–1,500/mo LINE-queue floor.
4. **Queue as the no-show cure + retention engine without a payment rail** — the
   call-ahead loop itself (live position + LINE "ใกล้ถึงคิว" + two-way "กำลังมา")
   is the no-show cure, plus backfill waitlist (OPP-05) + loyalty/referral ledger
   (OPP-15). Optional per-shop PromptPay-QR deposit only if monetization comes —
   never card-on-file.

---

## Persona pain points (the "why")

**Customer**
- After booking, the only artifact is a UUID URL — no receipt, no reminder,
  nothing says when the turn is near. The "leave and come back" promise is
  impossible today.
- No live "อีก N คิวก่อนถึงคุณ" or refreshing ETA — can't trust "how long until
  me?", the one question a queue concierge must answer.
- Can't reschedule (only cancel + rebook, losing the reference); can't act from
  LINE without opening the web app + phone/PIN login.
- Full shop/staff/day = dead end ("ไม่มีคิวว่าง"), no waitlist, no alert when a
  slot frees.
- No reviews/ratings or "near me"; can't tell which shop serves soonest.
- Phone+PIN is friction vs. LINE-native rivals; phone is unverified (no OTP) so a
  typo can mix bookings or let someone else set the PIN.

**Shop**
- Can't send the customer anything — no reminders, no "you're next" — so it eats
  no-shows with no tool to reduce them (the pain the category monetizes against).
  The fix we're betting on is the call-ahead loop (OPP-02/03), not strike-tracking.
- No waiting-room "now-serving" display.
- Walk-ins must be hand-typed into NewBookingDialog — no in-shop QR self-join, so
  the real floor isn't covered.
- No staff scheduling/time-off, no booking/customer notes, no analytics
  (fill rate, peak hours, utilization).

**Admin**
- No audit-log UI despite storing admin IDs on mutations; no admin-user
  management/roles — every admin is all-powerful and untraceable.
- No search/filter/sort/bulk in the shops list; suspension has statuses but no
  real workflow UI.

---

## Competitive landscape

| Competitor | Does well | So-what for us |
|---|---|---|
| **QueQ** | Live "X queues ahead" synced to in-store display; "almost your turn" push; geofenced remote queueing | Out-specialize (per-staff, duration-aware); copy "จำนวนคิวก่อนหน้า" + two-stage LINE nudge |
| **GoWabi** | Deals, 2.5% cashback wallet, tiers, referral, verified reviews, "Near Me", native apps | Don't fight on discounts; borrow phone-keyed loyalty/referral only; ship reviews + near-me; answer apps with PWA+LINE |
| **TimeTailor** | PromptPay payouts, SMS/email reminders, deposit protection, POS, per-staff KPIs | Can't match payouts; **LINE > SMS**; our staff/capacity rivals their KPIs; **no LINE integration = our opening** |
| **Fresha / Booksy** | Real-time waitlist auto-SMS deep-link on freed slot; card no-show protection; AI receptionist | Waitlist loop **is our queue DNA**; counter no-shows with the LINE call-ahead loop (not strikes/cards); "AI receptionist" = LINE "how long's the wait?" bot |
| **LINE-native TH** (FoxConnect/iPlan/BeTask) | Whole flow inside LINE (LIFF, auto-identity), rich-menu จองคิว, booking→CRM, ฿999–1,500/mo | Biggest gap; wrap booking as LIFF; per-shop rich-menu; phone-identity → "booking + CRM"; price vs ฿999–1,500 |
| **Square / SimplyBook.me** | Reply-to-manage SMS; self-serve reschedule in policy window; resource/buffer; intake forms | LINE messages as action surface (quick-reply) writing back via polling; extend `/bookings/[id]` to self-serve modify |
| **Yelp Waitlist / OpenTable / TablesReady** | Soonest-fit by party size; busy-by-hour; backfill to VIPs first; running-late chat; QR check-in; pause waitlist | Service = "party size" → soonest-slot ranking; backfill waitlist + real VIP; in-shop QR |

---

## Opportunity detail

### [OPP-01] หน้าติดตามคิวสด: "อีก N คิวก่อนถึงคุณ"
- **Persona:** customer · **Impact/Effort:** high · M · **หมวด:** retention
- **ปัญหา:** The concierge promise is "know when it's nearly your turn", but
  customers get a static request-time count and a dead confirmation URL.
- **ข้อเสนอ:** Live queue-tracking page (extend the UUID-gated `/bookings/[id]`)
  polling a server action every ~10–15s showing "อีก N คิวก่อนถึงคุณ" + live ETA,
  no app install. Single-source the position like slot-math so customer + shop
  views never disagree. **The hero screen.**
- **คู่แข่งอ้างอิง:** QueQ's decrementing "X queues ahead"; Waitlist Me/Waitly
  live "parties ahead". Thai users expect "จำนวนคิวก่อนหน้า", not a wall-clock.

### [OPP-02] แจ้งเตือนผ่าน LINE: ยืนยัน + "ใกล้ถึงคิว" + "ถึงคิวคุณ"
- **Persona:** platform · **Impact/Effort:** high · L · **หมวด:** retention
- **ปัญหา:** "เราจะเตือนผ่าน LINE" is copy with zero API; no outbound notification
  exists, so the leave-and-come-back loop literally cannot happen.
- **ข้อเสนอ:** Integrate LINE Messaging API; ship a 3–4 stage sequence:
  confirmation, T-Xh reminder, early "เหลืออีก N คิว" nudge (per-shop lead
  threshold), "ถึงคิวคุณแล้ว". Trigger from the existing polling/server-action
  path. Treat pushes as metered, **fail-silent** (per-recipient billing,
  over-quota drops); prefer reply-context where free, cap volume.
- **คู่แข่งอ้างอิง:** QueQ's two-stage push is its core retained behavior; LINE
  OA/FoxConnect/iPlan/BeTask all sell reminders as the no-show fix.
- ⚠️ **New infra:** LINE Messaging API + channel config + send-quota handling.

### [OPP-03] ปุ่มโต้ตอบใน LINE: กำลังมา / ขอเลื่อน / ยกเลิก
- **Persona:** customer · **Impact/Effort:** high · M · **หมวด:** retention
- **ปัญหา:** One-way notifications don't let a customer act from LINE; dead/no-show
  slots aren't freed early.
- **ข้อเสนอ:** Make LINE messages an action surface (quick-reply/flex:
  "กำลังมา"/"ขอเลื่อน"/"ยกเลิก") writing back via a server action into the shop's
  queue. No browser Supabase client needed — fits polling. Cancel/late instantly
  updates the queue and feeds the waitlist.
- **คู่แข่งอ้างอิง:** Square Assistant reply-to-manage SMS; TablesReady/Waitly/
  Waitwhile two-way "running late/cancel". Biggest no-show + dead-slot win for the
  least exotic infra. **Depends on OPP-02.**

### [OPP-04] เลื่อน/ยกเลิกการจองด้วยตนเอง (ในกรอบเวลาที่ร้านกำหนด)
- **Persona:** customer · **Impact/Effort:** high · M · **หมวด:** conversion
- **ปัญหา:** No reschedule at all — cancel + rebook loses the UUID reference.
  Table-stakes every competitor ships.
- **ข้อเสนอ:** Extend the UUID-gated `/bookings/[id]` into "เลื่อนเวลา" (re-run
  slot-math for a new slot in-place) + "คืนคิว/ยกเลิก", with the **shop** setting
  the allowed window (e.g. up to Xh before). Reuse `cancelOwnBooking` ownership
  keying; released slots feed the waitlist (OPP-05).
- **คู่แข่งอ้างอิง:** Calendly/Setmore/SimplyBook.me/Square/Hungry Hub all offer
  tokenized-link self-serve modify within shop-set policy windows.

### [OPP-05] รายชื่อรอคิว (waitlist) + แจ้งเตือนเมื่อมีคิวว่าง
- **Persona:** customer · **Impact/Effort:** high · M · **หมวด:** conversion
- **ปัญหา:** Full service/staff/day = dead "ไม่มีคิวว่าง" with no recourse, no
  alert when a cancellation opens a slot.
- **ข้อเสนอ:** "แจ้งเตือนเมื่อมีคิวว่าง" waitlist keyed to phone. On
  cancel/release, auto-offer the freed (date, service, staff) slot to the next
  eligible waitlister over LINE with a short claim window; roll on if unclaimed.
  Frame as a native queue strength.
- **คู่แข่งอ้างอิง:** Booksy real-time waitlist auto-deep-link; OpenTable backfill
  to prioritized guests; a virtual queue **is** this primitive. Pairs with OPP-13
  (VIP first-refusal) + OPP-03.

### [OPP-07] จอแสดงคิว "กำลังเรียก" สำหรับหน้าร้าน (ไม่ต้องใช้ฮาร์ดแวร์)
- **Persona:** shop · **Impact/Effort:** med · M · **หมวด:** ops-efficiency
- **ปัญหา:** The dashboard is an admin list, not a waiting-room display; on-prem
  incumbents sell ฿20k–30k displays/pagers.
- **ข้อเสนอ:** Full-screen web "now-serving / กำลังเรียกคิว" page on the shop's
  existing tablet, polling the same single source as the customer position view;
  pair with a clear "เรียกคิวถัดไป" action. Position as **"no hardware"**.
- **คู่แข่งอ้างอิง:** Q Natural/SANDI sell physical displays+pagers (~฿21.6k–
  26.7k); a free web display neutralizes their visible artifact + capital cost.

### [OPP-08] QR เช็คอินหน้าร้าน: ลูกค้า walk-in เข้าคิวเอง
- **Persona:** shop · **Impact/Effort:** high · M · **หมวด:** discovery
- **ปัญหา:** Walk-ins are hand-typed into NewBookingDialog, so online customers
  and the real floor are two worlds; ~100% floor coverage is the wedge vs app-only
  QueQ.
- **ข้อเสนอ:** Printable per-shop QR/short-link letting a walk-in self-join the
  live queue with phone + service (no login), unified under `bookings.
  customer_phone`. They then get the same live position page + LINE updates.
- **คู่แข่งอ้างอิง:** Q Natural hybrid printed-ticket+QR; TablesReady/Waitwhile QR
  self-check-in; LINE MyShop per-shop URL+QR. Pairs with OPP-01/02.

### [OPP-09] จองคิวผ่าน LINE (LIFF / Mini App) — ไม่ต้องล็อกอิน
- **Persona:** customer · **Impact/Effort:** high · L · **หมวด:** discovery
- **ปัญหา:** Standalone web app gated by phone+PIN while Thai users expect to book
  inside LINE; the login wall is the biggest UX gap vs LINE-native rivals.
- **ข้อเสนอ:** Wrap the booking flow as a LINE LIFF/Mini App: opens inside LINE,
  auto-fills name/profile from LINE identity (one-tap, no PIN), launches from a
  rich-menu tap. Keep phone-as-identity by linking LINE `userId` → phone on first
  booking. Highest-leverage distribution move.
- **คู่แข่งอ้างอิง:** FoxConnect/WELOVEBOOKING run the whole flow in LINE; 56M Thai
  LINE MAU, 70%+ already follow a business OA.
- ⚠️ **New infra:** LINE Login/LIFF channel; identity-linking model.

### [OPP-10] Rich-menu "จองคิว" deep link ต่อร้าน ⭐ quick win
- **Persona:** shop · **Impact/Effort:** med · S · **หมวด:** discovery
- **ปัญหา:** Discovery lives only on queva's home page; shops can't plug queva
  into their own LINE OA where their audience already is.
- **ข้อเสนอ:** First-class copy-pasteable rich-menu deep link (+ clean shareable
  booking URL + QR) into each shop's booking flow, so a "จองคิว" button in the
  shop's OA launches booking directly. Almost no new backend (shop already has
  public `/shops/[id]`).
- **คู่แข่งอ้างอิง:** Every LINE booking vendor wins by living in the shop's OA
  rich menu; LINE markets OA rich-menu "book via chat" to salons/spas.

### [OPP-11] จัดอันดับร้าน "คิวว่างเร็วสุด" + ตัวเลือก "พนักงานคนไหนก็ได้ = เร็วกว่า"
- **Persona:** customer · **Impact/Effort:** med · M · **หมวด:** discovery
- **ปัญหา:** Discovery sorts only by open/closed + newest; customers can't see who
  serves soonest, and don't realize "any staff" shortens the wait.
- **ข้อเสนอ:** Re-rank results by "soonest realistic slot for THIS service" once a
  service/category is picked (service = our "party size"). In booking, a
  "พนักงานคนไหนก็ได้ (คิวเร็วกว่า)" toggle using existing parallel capacity.
  Mostly ranking/UX over data we already compute. **⭐ The toggle half (OPP-11a)
  is a quick win** — first-free-staff already exists in `createBooking`.
- **คู่แข่งอ้างอิง:** Yelp Waitlist party-size-first → "wait fits now" + "open to
  sharing a table".

### [OPP-12] รีวิวหลังใช้บริการ (เฉพาะการจองที่เสร็จสิ้น) ผ่าน LINE
- **Persona:** customer · **Impact/Effort:** med · M · **หมวด:** trust
- **ปัญหา:** Discovery shows no ratings/reviews — a credibility gap vs every
  marketplace.
- **ข้อเสนอ:** Post-visit reviews gated to `status='completed'` on the phone
  identity, prompted over LINE, shown on the public shop page + as a discovery-card
  signal. Authenticity from gating to real visits; reuses the admin trust model.
  No payments.
- **คู่แข่งอ้างอิง:** GoWabi/Treatwell/Booksy/Fresha auto-collect post-visit
  reviews as discovery's trust currency.

### [OPP-13] VIP จริง + จัดลำดับคิว/บัมพ์คิว
- **Persona:** shop · **Impact/Effort:** med · M · **หมวด:** retention
- **ปัญหา:** "VIP" is only a Chip color — no `is_vip`, no priority, bookings
  immutable once confirmed; can't reward regulars or bump a priority customer.
- **ข้อเสนอ:** Real per-customer VIP flag (phone-keyed) the shop sets, surfaced in
  queue/booking views, used for (a) waitlist first-refusal (OPP-05) and (b)
  controlled re-order/bump within today's queue. Small state addition.
- **คู่แข่งอ้างอิง:** OpenTable fills freed slots to VIPs first; queva's marketing
  already promises VIP — make it real.

### [OPP-14] ลูกค้าสัมพันธ์เบา ๆ: ประวัติการมา + โน้ตลูกค้า (CRM-lite)
- **Persona:** shop · **Impact/Effort:** med · M · **หมวด:** retention
- **ปัญหา:** No booking/customer notes (allergy, "regular, prefers fade") and no
  per-customer visit history; queva reads as "just a calendar".
- **ข้อเสนอ:** Exploit phone-as-identity to show visit history (across anonymous/
  shop-made/authenticated bookings) + an editable internal notes field on the
  booking/customer record, visible in the queue view. No new identity model.
- **คู่แข่งอ้างอิง:** FoxConnect/iPlan auto-create a CRM record per booker; Square/
  Treatwell capture intake notes. Thai packaging is "booking + CRM".

### [OPP-15] เครดิตสะสม + ชวนเพื่อน (ผูกกับเบอร์โทร, ไม่ต้องมีระบบจ่ายเงิน)
- **Persona:** platform · **Impact/Effort:** med · M · **หมวด:** monetization
- **ปัญหา:** No retention loop; GoWabi locks spend with cashback/referral, queva
  has nothing sticky, and we have no payment processor for a wallet.
- **ข้อเสนอ:** Closed-loop loyalty-credit **ledger** keyed to `customer_phone`
  ("จองอีกได้เครดิต") + a referral reward with a 3-day anti-abuse hold — pure
  Supabase ledgers, no payments rail. Credit is informational/redeemable-later.
- **คู่แข่งอ้างอิง:** GoWabi 2.5% closed-loop wallet + ฿100-after-completed
  referral (3-day hold); BeTask bundles แต้ม at ฿999/mo. Both key cleanly to our
  phone identity.

### [OPP-17] Rate-limit + ยืนยันเบอร์ (OTP) สำหรับ login PIN
- **Persona:** platform · **Impact/Effort:** high · M · **หมวด:** trust
- **ปัญหา:** Phone is the identity key but **unverified**, and the 6-digit PIN
  endpoint has **no rate-limiting** — a 10-min login-intent window allows
  brute-forcing 1M combos; a typo'd/spoofed phone risks account takeover.
- **ข้อเสนอ:** Server-side rate-limit/lockout on phone-lookup + PIN-verify, and a
  LINE/SMS **OTP** on first PIN setup to verify phone ownership. Reuses the
  messaging integration from OPP-02. Protects every persona.
- **คู่แข่งอ้างอิง:** LINE-LIFF competitors derive verified identity from the LINE
  profile, sidestepping this. Documented high-severity risk. ⚠️ OTP depends on a
  messaging channel (OPP-02).

### [OPP-18] บันทึกการกระทำของแอดมิน (audit log) + ค้นหา/กรองรายการร้าน
- **Persona:** admin · **Impact/Effort:** med · M · **หมวด:** ops-efficiency
- **ปัญหา:** Admin IDs are stored on mutations but there's no audit-log UI, no
  admin-user/role management, and no search/filter/sort/bulk in the shops list.
- **ข้อเสนอ:** Queryable audit-log view (who approved/rejected/edited/
  impersonated, when), record impersonation sessions, and add search/filter
  (name, owner phone, category, status, date) + sort to the shops list. Phase in
  admin-user roles. **⭐ The search/filter half (OPP-18a) is a quick win** — pure
  UI over `listShops()`.
- **คู่แข่งอ้างอิง:** Standard marketplace-ops governance; product map flags audit
  trail + admin-user management as the two high-severity admin gaps.

### [OPP-19] แดชบอร์ดสรุปร้าน: ชั่วโมงคนเยอะ, อัตราเต็มคิว, การใช้งานพนักงาน
- **Persona:** shop · **Impact/Effort:** med · M · **หมวด:** ops-efficiency
- **ปัญหา:** Shops get only a live list — no fill rate, peak-time, or staff
  utilization to run the business or fill dead hours.
- **ข้อเสนอ:** Lightweight analytics page: busy-by-hour (booking density), fill
  rate, cancellation rate, per-staff utilization. Busy-by-hour later
  powers a customer "good time to book" nudge. Aggregate queries over existing
  bookings; no new infra.
- **คู่แข่งอ้างอิง:** Vagaro/Treatwell/Fresha ship utilization/revenue analytics;
  Yelp's predictive busy-by-hour shows the customer-facing payoff.

### [OPP-20] เซ็ตบริการแบบแพ็กเกจ + จองเป็นกลุ่ม (มาเป็นกลุ่ม)
- **Persona:** customer · **Impact/Effort:** med · L · **หมวด:** monetization
- **ปัญหา:** Only single-service "price-from" booking; common Thai use-cases
  (cut+wash+beard; a group doing nails; bridal party) aren't first-class.
- **ข้อเสนอ:** Bookable service **bundles** (one upfront price across multiple
  durations) and group "มาเป็นกลุ่ม" bookings reserving multiple parallel staff
  slots at once — the GiST overlap + parallel-capacity math already supports
  multi-seat holds. Phase-2 LTV play on the existing catalogue.
- **คู่แข่งอ้างอิง:** Hungry Hub fixed-price Party Pack; SimplyBook.me/Square group
  bookings with per-head pricing.

### [OPP-21] แถบสรุปสถานการณ์หน้า dashboard ร้าน (at-a-glance bar)
- **Persona:** shop · **Impact/Effort:** high · M · **หมวด:** ops-efficiency
- **ปัญหา:** `/shop` เป็น "today list + complete/cancel" ที่ดี แต่ไม่ใช่ command
  center — owner เปิดหน้าแรกแล้วยังตอบไม่ได้ว่า วันนี้ได้เงินเท่าไหร่/เต็มยัง/
  เหลือที่ว่างกี่คิว, คิวถัดไปคือใคร+ใครเลยเวลา, ลูกค้ากด "กำลังมา" แล้วยัง, มีกี่คน
  รอ waitlist วันนี้. ข้อมูลเกือบทั้งหมด **มีใน schema/service แล้ว** เป็นงาน assemble.
- **ข้อเสนอ:** Q1 glance bar (ยอดเงินวันนี้จาก completed×servicePrice + ที่ว่าง
  เหลือจาก BookingContext/slot-math) · Q2 ไฮไลต์ "คิวถัดไป" + ป้าย "เลยเวลา X นาที"
  · Q3 ป้าย "กำลังมา ✓" จาก `coming_ack_at` (OPP-03/04) · Q4 การ์ด "มี N คนรอคิว
  ว่างวันนี้" (OPP-05). **Out of scope:** VIP/บัมพ์คิว = OPP-13; now-serving จอ =
  OPP-07; analytics เชิงลึก = OPP-19.
- **Data flag:** ไม่ต้อง migration. ต้อง (a) select `coming_ack_at` เข้า
  `listBookingsByShop` + `BookingListItem` (คอลัมน์มีแล้ว แต่ยังไม่ได้ select),
  (b) เพิ่ม service shop-keyed `countWaitingForShopToday(shopId)` ใน `waitlist.ts`
  (ของเดิม customer-keyed by phone เท่านั้น).
- **คู่แข่งอ้างอิง:** QueQ/Fresha/GoWabi shop dashboard มาตรฐาน = คิวถัดไป+call-next,
  ตัวนับรอ/เสร็จ, ยอดวันนี้, fill/ที่ว่าง at a glance.
- **PRD:** `docs/product/prd/opp21-dashboard-glance-bar.md`

---

## How to use this backlog

- **Pick the next item** from NOW, or ask `@product-owner` to re-prioritize given
  a goal (e.g. "ลด no-show", "เพิ่ม booking conversion", "shop activation").
- **Turn an item into a build:** ask `@product-owner` to write the PRD
  (`docs/product/prd/<slug>.md`), then hand off to `architect` / `ecc:planner` /
  `feature-dev` to implement.
- **Re-audit:** competitor facts and "current state" drift — `@product-owner`
  re-reads the code + re-searches the web before committing to a spec.
