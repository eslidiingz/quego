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
- **Supabase** wired via [.env.local](.env.local) (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Server secret key is intentionally
  commented out; only add when admin bypass-RLS actions become necessary.
- **Storybook 10** on the Next.js Vite framework — design system + page
  composites are documented there.

## Commands (always use pnpm)

```bash
pnpm dev              # Next.js dev server (Turbopack) → http://localhost:3000
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
├── app/                # Next.js App Router routes (currently only the home placeholder)
│   ├── globals.css     # ALL design tokens live here (Tailwind v4 @theme)
│   └── layout.tsx      # Loads IBM Plex Sans Thai via next/font, sets `lang="th"`
├── components/
│   ├── ui/             # Design system primitives (Button, Input, Chip, …)
│   ├── booking/        # Booking-domain components (QueueCard, ShopCard, …)
│   └── layout/         # App chrome (TopAppBar, BottomNavBar, SidebarNav)
├── lib/
│   └── cn.ts           # cn() — clsx + extended tailwind-merge (see gotcha below)
└── stories/            # Storybook organized by Foundations / UI / Booking / Layout / Pages
.storybook/             # main.ts, preview.tsx, preview-head.html (Material Symbols font)
design/                 # Source HTML mockups + screenshots + DESIGN.md
```

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
  routes, ensure a `<link>` to the same stylesheet is rendered (not yet
  wired in `app/layout.tsx`).

### Storybook structure & sort order

`.storybook/preview.tsx` defines a story sort order:
`Foundations → UI → Booking → Layout → Pages`. The `Pages/*` stories compose
real component sets into full screens that mirror the seven mockups in
[design/](design/) — use them to validate visual changes across the whole
flow.

### Persona-driven feature plan

The next admin feature set (per current direction) starts here:

1. **Admin auth** — login by **phone number + password**.
2. **Seeded super-admin** — phone `0811129499`, password `@Admin1234!`.
3. **Shop category management** — admin CRUD on the taxonomy used by
   shop signup and customer discovery filters.

Plan Supabase tables and RLS around these three personas (customer, shop,
admin) from the start; the admin role must be able to bypass RLS for
moderation actions, which is why the secret key slot in `.env.local` exists.

## Gotchas

- **Floating UI (modal, toast, dropdown) must portal to `document.body`.**
  The admin sidebar uses `translate-x-*` for slide-in animation, and CSS spec
  says any `transform` on an ancestor turns it into the containing block for
  descendant `position: fixed`. Without a portal the modal renders inside the
  sidebar's 288px column instead of centering on the viewport. Both
  [Modal](src/components/ui/Modal.tsx) and [Toast](src/components/ui/Toast.tsx)
  already use `createPortal(node, document.body)` with a mount guard for SSR —
  follow the same pattern for any new floating component.
- The repo was scaffolded with `create-next-app` then customized — the
  default [src/app/page.tsx](src/app/page.tsx) and [README.md](README.md) are
  still the boilerplate and should be replaced when building real routes.
- [AGENTS.md](AGENTS.md) (imported above via `@AGENTS.md`) reminds you that
  **Next.js 16 has breaking changes vs. training data**. Before touching
  routing, server actions, fetch caching, or `next/*` APIs, read the relevant
  doc under `node_modules/next/dist/docs/`.
- `pnpm` is the only supported package manager here. Don't introduce
  `npm`/`yarn` lockfiles or scripts.
