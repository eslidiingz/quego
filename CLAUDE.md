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
- **Storybook 10** on the Next.js Vite framework — design system + page
  composites are documented there.

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

## Commands (always use pnpm)

```bash
pnpm dev              # Next.js dev server (Turbopack) → http://localhost:4000
pnpm build            # Production build (Turbopack)
pnpm start            # Serve the production build
pnpm lint             # ESLint (next/core-web-vitals + typescript + storybook)
pnpm storybook        # Storybook dev → http://localhost:6006
pnpm build-storybook  # Static Storybook build → ./storybook-static
pnpm vitest           # Run Storybook addon-vitest tests (browser mode, chromium)
pnpm vitest run <storyPath>   # Run a single story file's tests
```

The Vitest setup ([vitest.config.ts](vitest.config.ts)) reuses Storybook
stories as tests via `@storybook/addon-vitest` running in real Chromium
(`@vitest/browser-playwright`). There is no separate unit-test suite — write
component tests by adding stories.

## Repo map

```
src/
├── proxy.ts            # Next.js 16 middleware (renamed!) — route-guards every persona area
├── app/                # App Router routes, grouped by persona (see "Routing" below)
│   ├── page.tsx        # Customer home / shop discovery
│   ├── shops/          # Public: shop detail, booking form, registration
│   ├── me/             # Customer-authed area ("my queue")
│   ├── login/          # Unified customer/shop step-1 login
│   ├── shop/           # Shop-owner area — (authed)/ subtree + /shop/login
│   ├── admin/          # Admin area — (authed)/ subtree + /admin/login
│   ├── bookings/[id]/  # Public booking confirmation (UUID-gated)
│   ├── globals.css     # ALL design tokens live here (Tailwind v4 @theme)
│   └── layout.tsx      # IBM Plex Sans Thai + Material Symbols, lang="th"
├── components/         # ui/ (primitives) · booking/ · layout/ · admin/ · shop/
├── lib/
│   ├── cn.ts           # cn() — clsx + extended tailwind-merge (see gotcha below)
│   ├── auth/           # session.ts (JWT core) + *-session-server.ts + password.ts
│   ├── services/       # Server-only data layer (shops, bookings, customers, …)
│   ├── supabase/       # admin.ts — cached service-role client
│   ├── booking/        # slot-math.ts — pure, browser-safe slot generation
│   ├── time/           # bangkok.ts — "what time is it in ICT?" helpers
│   └── validation/     # shop.ts — shared input validators
└── stories/            # Storybook: Foundations / UI / Booking / Layout / Pages
.storybook/             # main.ts, preview.tsx, preview-head.html (Material Symbols font)
design/                 # Source HTML mockups + screenshots + DESIGN.md
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
  `font-variation-settings`. The font is loaded in Storybook by
  [.storybook/preview-head.html](.storybook/preview-head.html); for Next.js
  routes it is rendered as a `<link>` in [app/layout.tsx](src/app/layout.tsx)'s
  `<head>` (the `@next/next/no-page-custom-font` lint there is a Pages-Router
  false positive and is intentionally disabled).

### Storybook structure & sort order

`.storybook/preview.tsx` defines a story sort order:
`Foundations → UI → Booking → Layout → Pages`. The `Pages/*` stories compose
real component sets into full screens that mirror the seven mockups in
[design/](design/) — use them to validate visual changes across the whole
flow.

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
  client picker's rules are a UX convenience, not a trust boundary. A partial
  unique index is the final backstop for slot races (Postgres `23505`).
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

### Database schema

The schema (`admins`, `customers`, `shops`, `shop_categories`,
`shop_business_hours`, `bookings`) lives in the **remote Supabase project**, not
in repo migrations. Inspect/alter it via the Supabase MCP tools (`list_tables`,
`apply_migration`) rather than expecting SQL files locally. A super-admin is
seeded directly in Supabase (phone `0811129499`).

## Gotchas

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
