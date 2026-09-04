# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

**LuxeQueue** (codename **Aura Queue**) — an online booking / queue concierge
product. UI copy is **Thai**. The product spans three personas:

- **Customer** — discover shops, book a queue, track status.
- **Shop** — manage their queue (call next, delay, mark VIP).
- **Admin** — approve shop registrations, manage taxonomy, monitor system.

Source designs (HTML + screenshots) and the brand spec live under
[design/](design/). [design/aura_queue/DESIGN.md](design/aura_queue/DESIGN.md)
is the authoritative brand/style document — read it before introducing any new
visual treatments.

## Tech stack

- **Next.js 16.2.6** with App Router, Turbopack, and React Compiler
  (`reactCompiler: true` in [next.config.ts](next.config.ts)).
- **React 19.2** with the new compiler — manual `useMemo`/`useCallback` is
  rarely needed.
- **TypeScript** strict, path alias `@/* → src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. **There is no
  `tailwind.config`** — all design tokens (colors, typography, spacing, radii,
  shadows) live in `@theme` inside [src/app/globals.css](src/app/globals.css).
- **Supabase** (`@supabase/supabase-js`) accessed **server-side only** through
  a cached service-role client ([src/lib/supabase/admin.ts](src/lib/supabase/admin.ts)).
  RLS is deny-all on app tables; all authorization happens in the service layer.
  See "Data access" below.
- **`jose`** for session JWTs (HS256), **`node:crypto` scrypt** for password /
  PIN hashing ([src/lib/auth/password.ts](src/lib/auth/password.ts)).
- **Vitest** (`node` environment) for the pure-logic unit suite — see "Testing".
- **Integrations**, each isolated in its own `src/lib/*` module and keyed off
  `.env.local`: **LINE** Messaging API + LINE Login for notifications and account
  linking ([src/lib/line/](src/lib/line)), **Firebase** phone-OTP for signup
  verification ([src/lib/firebase/](src/lib/firebase)), **Cloudflare R2** (via the
  S3 SDK) for shop image storage ([src/lib/r2/](src/lib/r2)), and **`qrcode`** for
  shareable shop QR codes.

### Environment variables

Copy [.env.example](.env.example) → `.env.local`. Required:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public client.
- `SUPABASE_SECRET_KEY` — service-role key, server-only (no `NEXT_PUBLIC_`
  prefix so it never enters the browser bundle). Every DB read/write goes
  through it.
- `ADMIN_SESSION_SECRET` — ≥32 chars. Signs **all three** session JWTs (admin,
  shop, customer) plus the short-lived login-intent cookies; they are
  separated by the `aud` claim, not by key. Rotating it invalidates every
  active session. (Despite the name, it is not admin-only.)
- `NEXT_PUBLIC_SITE_URL` — canonical origin used to build shareable absolute
  links + QR codes (no trailing slash). Falls back to `$VERCEL_URL`, then
  `localhost:4000`.

The integrations have their own env groups, **all documented inline in
[.env.example](.env.example)** (read it before touching them — the comments carry
go-live security hardening you can't infer from code):

- **LINE** — `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` (Messaging API,
  server-only), `LINE_LOGIN_CHANNEL_ID` / `LINE_LOGIN_CHANNEL_SECRET` (LINE
  Login OAuth), `NEXT_PUBLIC_LINE_OA_BASIC_ID` (public deep-link).
- **Firebase** phone-OTP — `NEXT_PUBLIC_FIREBASE_*` web config only. There is **no
  service-account secret**: the server verifies the OTP ID token (RS256) with
  `jose` against Google's public keys. The Firebase Admin SDK was deliberately
  removed (it failed under the Turbopack serverless build).
- **Cloudflare R2** — `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
  / `R2_BUCKET` / `R2_ENDPOINT` (server-only write creds) and
  `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` (public read host). The DB stores the object
  **key**, never the URL, so the public host can change without a data migration.

## Commands (always use pnpm)

```bash
pnpm dev              # Next.js dev server (Turbopack) → http://localhost:4000
pnpm build            # Production build (Turbopack)
pnpm start            # Serve the production build
pnpm lint             # ESLint (next/core-web-vitals + typescript)
pnpm test             # Vitest, run-once (CI mode)
pnpm test:watch       # Vitest, watch mode

# Run a single test file or filter by name:
pnpm test src/lib/booking/slot-math.test.ts
pnpm test -t "rejects overlapping slot"
```


## Repo map

```
src/
├── proxy.ts            # Next.js 16 middleware (renamed!) — route-guards every persona area
├── app/                # App Router routes, grouped by persona (see "Routing" below)
│   ├── page.tsx        # Customer landing / shop discovery
│   ├── business/       # Public shop-owner landing (sells the product to shops)
│   ├── shops/          # Public: shop detail (/shops/{handle}), booking + walk-in, registration
│   ├── me/             # Customer-authed area (bookings, profile, waitlist)
│   ├── login/          # Unified customer/shop step-1 login (+ /login/pin)
│   ├── shop/           # Shop-owner area — (authed)/ subtree, (display)/ kiosk, /shop/login
│   ├── admin/          # Admin area — (authed)/ subtree (shops, categories, presets, audit) + /admin/login
│   ├── bookings/[id]/  # Public booking confirmation + reschedule (UUID-gated)
│   ├── api/            # Route handlers: LINE webhook + shop/customer LINE OAuth callbacks
│   ├── design-system/  # Live token/component gallery (dev reference)
│   ├── globals.css     # ALL design tokens live here (Tailwind v4 @theme) + `.dark` overrides
│   └── layout.tsx      # Sora + Anuphan + Material Symbols, lang="th", no-FOUC theme script
├── components/         # ui/ · booking/ · layout/ · admin/ · shop/ · auth/ · landing/ · reviews/ · tour/
├── lib/
│   ├── cn.ts           # cn() — clsx + extended tailwind-merge (see gotcha below)
│   ├── baht.ts, slug.ts, url.ts  # ฿ formatting · shop handles · absolute-link building
│   ├── auth/           # session.ts (JWT core) + *-session-server.ts + password.ts + lockout.ts
│   ├── services/       # Server-only data layer (shops, bookings, staff, expenses, reviews, line-*, …)
│   ├── supabase/       # admin.ts — cached service-role client
│   ├── booking/        # slot-math.ts — pure, browser-safe slot generation (+ period/cutoff/queue)
│   ├── time/           # bangkok.ts — "what time is it in ICT?" helpers
│   ├── validation/     # shared input validators (shop, phone, uuid, media)
│   ├── line/           # LINE Messaging/Login: signature, client, flex builders, commands, oauth
│   ├── firebase/       # Firebase phone-OTP ID-token verification (jose, no Admin SDK)
│   ├── r2/             # Cloudflare R2 (S3 SDK) image upload + magic-byte validation
│   ├── shop/           # setup-checklist.ts — pure activation-checklist derivation
│   ├── tour/           # Guided-tour registries + spotlight geometry (pure data — see below)
│   ├── expenses/       # Shop expense categories
│   ├── waitlist/       # Waitlist eligibility
│   ├── insights/       # Shop analytics aggregation (pure)
│   ├── location/       # Thailand province/district/subdistrict data + maps links
│   ├── security/       # Rate-limiting
│   └── customer/       # Customer-side helpers

supabase/migrations/    # In-repo schema — baseline + dated migrations (see "Database schema")
design/                 # Source HTML mockups + screenshots + DESIGN.md + DARK_MODE.md
docs/                   # product/ (backlog, competitive analyses) + marketing/ strategy
```

Folders under `app/<persona>/(authed)/` are **route groups** — the `(authed)`
segment is a guard convention (no URL impact); its `layout.tsx` calls
`require*Session()` so every child page is server-side gated even though
[proxy.ts](src/proxy.ts) already redirects unauthenticated requests.

## Architecture notes

### Design tokens are pure CSS, not JS

Tailwind v4 reads tokens from `@theme { … }` in [globals.css](src/app/globals.css).
That means **adding a new color/typography token requires only editing
globals.css** — the utility (`bg-foo`, `text-foo`) becomes available
immediately. There is no `tailwind.config.{ts,js}` to update.

### Dark mode is class-based, and every token has to be re-stated

Tailwind v4 binds `dark:` to `prefers-color-scheme` by default. [globals.css](src/app/globals.css)
**rewires it** — `@custom-variant dark (&:where(.dark, .dark *))` — so the theme
follows a `.dark` class on `<html>`, which the user's toggle controls. Consequences
you must respect:

- Light values live in `@theme { … }`; **every** dark value is re-declared in the
  `.dark { … }` block further down the same file. Adding a `--color-*` token means
  adding it in *both* places or dark mode silently keeps the light value.
- Custom utilities and shadows that hard-code colors instead of reading `--color-*`
  (`.bg-quego-hero`, `.glass-card`, `.tour-spotlight`, …) don't track tokens, so each
  has its own `.dark .x` override. Prefer tokens; if you must hard-code, add the
  override.
- The class is applied by an **inline, blocking `<script>` in
  [layout.tsx](src/app/layout.tsx)** before first paint (reads `localStorage`
  key `quego-theme`, falls back to the OS preference). That's why `<html>` carries
  `suppressHydrationWarning` — don't remove it, and don't move the script to
  `next/script` or the page will flash the wrong theme.
- [ThemeToggle](src/components/ui/ThemeToggle.tsx) owns the same storage key. The
  full dark palette + contrast report is spec'd in
  [design/aura_queue/DARK_MODE.md](design/aura_queue/DARK_MODE.md).

### `cn()` knows about our custom typography tokens

[src/lib/cn.ts](src/lib/cn.ts) calls `extendTailwindMerge` to register custom
`text-*` font-size tokens (`text-display-lg`, `text-headline-md`,
`text-body-md`, `text-label-md`, …) as the `font-size` class group. Without
this, `tailwind-merge` would conflate them with color utilities like
`text-on-primary` and silently drop the color when both appear in `cn(...)`.
**If you add a new typography token to `globals.css`, also add it to the
`fontSizeTokens` array in `cn.ts`.**

### Component conventions

- Variants use a string-map pattern (`const variants: Record<Variant, string> = {…}`)
  and are composed via `cn(base, sizes[size], variants[variant], …)`.
- Order inside `cn()` matters when classes might still collide outside the
  groups twMerge knows about — list `variants[…]` **after** `sizes[…]` so
  variant colors stay last.
- Icons come from Material Symbols Outlined via the
  [`Icon`](src/components/ui/Icon.tsx) wrapper, which sets the right
  `font-variation-settings`. The font is rendered as a `<link>` in [app/layout.tsx](src/app/layout.tsx)'s
  `<head>` (the `@next/next/no-page-custom-font` lint there is a Pages-Router
  false positive and is intentionally disabled).
- **Typography is Sora + Anuphan**, both via `next/font/google`. Sora carries
  Latin display text and numerals; **Anuphan carries all Thai** — Sora has no Thai
  glyphs, so where `--font-display` leads with Sora, Thai falls through to Anuphan
  per glyph. Never set a Latin-only family as the sole face on Thai copy.


### Routing & route protection

[src/proxy.ts](src/proxy.ts) is the **Next.js 16 middleware** — the file and
export are named `proxy`, not `middleware` (a Next 16 rename; the old name
won't run). It guards four namespaces and is the place to reason about who can
reach what:

- `/admin/*` → admin session, else redirect `/admin/login`.
- `/shop/*` → shop session, else `/shop/login`. **NB:** `/shops/*` (plural) is
  the *public* customer/registration namespace and is deliberately not guarded.
- `/me/*` → customer session, else `/login`.
- `/login*` → if already signed in (customer or shop), bounce to that area.

Guards are defence-in-depth: `(authed)` layouts re-check via `require*Session()`.

### Auth & sessions (three personas, one secret)

[src/lib/auth/session.ts](src/lib/auth/session.ts) holds the JWT core — sign/
verify for admin, shop, and customer tokens, all HS256 off `ADMIN_SESSION_SECRET`,
distinguished by `aud` (`"admin" | "shop" | "customer"`). 8-hour TTL.
The `*-session-server.ts` files (`server-only`) wrap these with httpOnly cookie
get/set/destroy and the `require*Session()` redirect helpers.

- **Admin** logs in with **phone + password** (`admins` table, scrypt hash).
- **Shop owner** and **customer** use a **two-step phone → 6-digit PIN** flow.
  Step 1 verifies the phone and drops a short-lived signed *login-intent* cookie
  (`set*LoginIntent`, 10 min); step 2 reads it and routes to PIN **setup**
  (first time) vs **verify**. PINs are scrypt-hashed like passwords.
- **Impersonation:** an admin can mint a shop session carrying an
  `impersonatedBy` claim (`createImpersonationSession`); the shop UI renders
  [ImpersonationBanner](src/components/shop/ImpersonationBanner.tsx) and routes
  sign-out back to `/admin`.
- **Phone ownership at signup** is proved separately, via **Firebase phone-OTP**
  (browser → Firebase → ID token → server verifies with `jose`). This gates
  *registration*, not session login; `shops.phone_verified_at` records it. The
  OTP SMS path bypasses the server rate limiter, so console-side hardening (App
  Check, +66-only region policy, quotas) is mandatory before go-live — see
  [.env.example](.env.example).
- **LINE account linking** is orthogonal to auth: shops and customers each link
  a LINE userId (`/api/{shop,customer}/line/connect` → `…/callback` OAuth, or a
  short-lived link code) so the Messaging API can push notifications to them.

### Data access — service layer over a service-role client

There is **no per-user Supabase auth and no RLS-based authorization**. App
tables are RLS deny-all; everything goes through the cached **service-role**
client ([getSupabaseAdmin()](src/lib/supabase/admin.ts)), which bypasses RLS.
**Therefore every authorization decision lives in application code**, almost
always in [src/lib/services/](src/lib/services). Conventions to preserve:

- Services are `server-only`, return **typed discriminated-union results**
  (`{ ok: true, … } | { ok: false, code, message }`) with Thai `message`s —
  they never throw for domain errors, set cookies, or redirect.
- **Ownership is enforced by compound filters**, never by trusting request
  input: e.g. `updateBookingStatus` filters `.eq("id").eq("shop_id")` with the
  `shopId` taken from the verified session, so a shop can't touch another's row.
- Writes **re-validate end-to-end** server-side (see `createBooking`) — the
  client picker's rules are a UX convenience, not a trust boundary. The final
  backstop for slot races is a pair of **GiST `EXCLUDE` overlap constraints** on
  `bookings` (`bookings_no_overlap_noassign` for shop-wide slots,
  `bookings_no_overlap_staff` per assigned staff lane), which raise Postgres
  `23P01` (also tolerant of `23505`). `createBooking` catches that, frees the
  lane, and retries the next free staff — so a concurrent double-book loses the
  race instead of corrupting the calendar.
- **Phone number is the customer identity key.** Bookings link to a customer by
  `bookings.customer_phone`, not a FK — so anonymous bookings, shop-made
  bookings, and authenticated bookings all surface under one phone.

### Server actions sit between pages and services

`actions.ts` files are thin `"use server"` adapters: parse `FormData`, call a
service, then `revalidatePath` / `redirect` / return state for React 19
`useActionState`. Keep parsing + HTTP concerns here and domain logic in the
service. User-facing flash messages ride a `?notice=` search param decoded by
[FlashToast](src/components/ui/FlashToast.tsx).

### Time is always Bangkok (ICT, UTC+7)

Never use raw `new Date()` for business dates. [src/lib/time/bangkok.ts](src/lib/time/bangkok.ts)
projects "now" into ICT (`getBangkokToday`, `getBangkokNow`, `getBangkokDateWindow`,
`dayOfWeekFor`) so date logic is host-timezone-independent. Slot generation is
pure and shared client+server via [src/lib/booking/slot-math.ts](src/lib/booking/slot-math.ts)
so the picker and the validator can never disagree about which times exist.

### Shop onboarding: activation checklist + guided tour

Two separate systems, both deliberately **pure data + pure derivation** so they
stay in the `node` test env:

- **Activation checklist** — [lib/shop/setup-checklist.ts](src/lib/shop/setup-checklist.ts)
  turns five booleans (service, open day, location pin, logo, active staff) into an
  ordered task list. Two tiers: `blocking` tasks (services, hours) mean the shop
  literally cannot take a booking and drive the focus modal; the rest are surfaced,
  never nagged. The service layer ([services/shop-setup.ts](src/lib/services/shop-setup.ts))
  does the reading; the module itself performs no I/O.
- **Guided tour** — [lib/tour/](src/lib/tour) is a registry of coachmark steps as
  **pure data, no JSX and no functions**, keyed to `data-tour="<id>"` anchors
  ([anchors.ts](src/lib/tour/anchors.ts)). Every anchored step must supply
  `fallbackBody`, because a missing anchor is the *normal* case (empty-state pages,
  the off-canvas nav below `lg`) — `shop-tours.test.ts` enforces this. Progress is
  persisted as `shops.tour_seen_at`.

The tour copy is held to a hard rule worth preserving: **describe only what the app
actually does.** There is no shop-side reschedule, no VIP marking, and no
`/shop/waitlist` page — if you add a step, verify the control exists first.

### Testing

[vitest.config.ts](vitest.config.ts) runs `src/**/*.test.ts` in a **`node`**
environment. The suite is **pure-logic only** — slot math, Bangkok time, insights
aggregation, validators, waitlist rules, the setup-checklist and guided-tour
registries, auth hashing/lockout, and the LINE signature/format/command helpers. There is **no DOM, no React-render, and no
DB** in tests; don't reach for jsdom or a live Supabase.

Two aliases make this work (mirroring how the app imports): `@/…` → `src/…`, and
**`server-only` → [test/empty.ts](test/empty.ts)** (an empty stub). The stub lets
a test import the *pure* exports of a `server-only` module (e.g. session signing,
LINE HMAC verification) without dragging in the RSC-only runtime. Co-locate tests
next to the unit (`foo.ts` → `foo.test.ts`); keep anything DB- or
request-dependent out of them.

### Database schema

The schema now lives **in-repo** under
[supabase/migrations/](supabase/migrations). 60 incremental migrations were once
consolidated into `20260620000000_baseline_schema.sql`; **that baseline is a
starting point, not the current schema** — dated migrations have landed on top of
it since, so read the whole directory in filename order (or query the live DB)
before assuming a column exists. Apply the baseline first to a fresh Supabase
project (it `CREATE EXTENSION`s `btree_gist`, required by the booking overlap
constraints and **not** present by default on new projects), then the rest in
order. Inspect/alter the live DB via the Supabase MCP tools (`list_tables`,
`apply_migration`); add new changes as **new dated migration files**, never edit
the baseline. A super-admin is seeded directly in Supabase (phone `08XXXXXXXX`).

The live table set groups by domain:

- **Core** — `admins`, `customers`, `shops`, `shop_categories`,
  `shop_business_hours`, `bookings`.
- **Catalog & staff** — `shop_services`, `shop_staff`, `shop_staff_services`,
  `category_service_presets` (admin-curated service templates per category).
- **Engagement** — `reviews`, `waitlist_entries`, `shop_customer_notes`.
- **Money** — `shop_expenses` (owner-entered running costs, behind `/shop/expenses`).
- **LINE** — `line_link_codes`, `line_message_log` (dedups inbound by
  `line_message_id`).
- **Ops** — `admin_audit_logs`, `rate_limits`.

`bookings` carries a `time_range` and optional `staff_id`; identity is still the
denormalized `customer_phone` (no FK) — see the Data-access note above.
`shops` also carries `latitude`/`longitude` (the map pin that powers distance on
discovery) and `tour_seen_at` (guided-tour state).

**Loyalty is gone, permanently.** `20260701000000_drop_loyalty_promotions_referrals.sql`
dropped `loyalty_ledger`, `referrals`, `shop_promotions`, `promotion_stamps` and
`customers.referral_code`. They still appear in the baseline file — that file is
history, not truth. Don't reintroduce points/stamps/referrals without an explicit
product decision; it was removed on purpose.

The one **view**: `shop_customer_summary` (one row per shop × customer_phone —
visits, lifetime spend, last visit) backs the CRM list at `/shop/customers`. It is
`security_invoker = true`, so it inherits `bookings`' deny-all RLS; the app reads
it through the service-role client and scopes by `.eq("shop_id", …)` like every
other read.

## Gotchas

- **`serverActions.bodySizeLimit` is `5mb` and it is GLOBAL.** Set in
  [next.config.ts](next.config.ts) so cropped shop logo/cover uploads (which stream
  through a server action) aren't rejected by the default 1 MB cap. It applies to
  *every* server action, so the real per-slot limits are enforced in
  [lib/validation/media.ts](src/lib/validation/media.ts) (2 MB logo / 4 MB cover) —
  keep validating payload size in the action, not just at the envelope.
- **`/shops/[id]` takes a handle, not only a UUID.** The segment resolves either;
  a UUID hit with a handle on record `redirect()`s once to `/shops/{handle}` so
  shares and SEO settle on the pretty URL. Build links with
  `shop.handle ?? shop.id`. Handle rules are pure in [lib/slug.ts](src/lib/slug.ts).
- **Baseline HTTP security headers are set in [next.config.ts](next.config.ts)**
  (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS) on `/:path*`. If a
  route ever needs framing (an embed, a LINE LIFF view), it has to be exempted
  there — it will otherwise fail silently in the browser.
- **Floating UI (modal, toast, dropdown) must portal to `document.body`.**
  The admin sidebar uses `translate-x-*` for slide-in animation, and CSS spec
  says any `transform` on an ancestor turns it into the containing block for
  descendant `position: fixed`. Without a portal the modal renders inside the
  sidebar's 288px column instead of centering on the viewport. Both
  [Modal](src/components/ui/Modal.tsx) and [Toast](src/components/ui/Toast.tsx)
  already use `createPortal(node, document.body)` with a mount guard for SSR —
  follow the same pattern for any new floating component.
- **Middleware is [src/proxy.ts](src/proxy.ts), exporting `proxy` (Next 16
  rename).** A file named `middleware.ts` or an export named `middleware` will
  silently not run.
- [README.md](README.md) is still untouched `create-next-app` boilerplate
  (references `localhost:3000`, Geist font — neither is true here); don't trust
  it as documentation.
- [AGENTS.md](AGENTS.md) (imported above via `@AGENTS.md`) reminds you that
  **Next.js 16 has breaking changes vs. training data**. Before touching
  routing, server actions, fetch caching, or `next/*` APIs, read the relevant
  doc under `node_modules/next/dist/docs/`.
- `pnpm` is the only supported package manager here. Don't introduce
  `npm`/`yarn` lockfiles or scripts.
