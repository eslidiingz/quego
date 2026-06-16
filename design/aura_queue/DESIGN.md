---
name: Aura Queue
colors:
  surface: '#ffffff'
  surface-dim: '#e2e7e5'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f6f5'
  surface-container: '#eef2f0'
  surface-container-high: '#e8efed'
  surface-container-highest: '#e2e9e6'
  on-surface: '#14302c'
  on-surface-variant: '#5c726c'
  inverse-surface: '#14302c'
  inverse-on-surface: '#f4f6f5'
  outline: '#8a9b95'
  outline-variant: '#d5deda'
  surface-tint: '#0f766e'
  primary: '#0f766e'
  on-primary: '#ffffff'
  primary-container: '#0b5a54'
  on-primary-container: '#c9f0e4'
  inverse-primary: '#9fe1cb'
  secondary: '#f97362'
  on-secondary: '#ffffff'
  secondary-container: '#ffdad2'
  on-secondary-container: '#5a1a10'
  tertiary: '#c9912f'
  on-tertiary: '#ffffff'
  tertiary-container: '#fae2b0'
  on-tertiary-container: '#4a3306'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#1d9e75'
  on-success: '#ffffff'
  success-container: '#c6f0de'
  on-success-container: '#00210d'
  primary-fixed: '#c9f0e4'
  primary-fixed-dim: '#9fe1cb'
  on-primary-fixed: '#07312d'
  on-primary-fixed-variant: '#0b5a54'
  secondary-fixed: '#ffdad2'
  secondary-fixed-dim: '#f9a99d'
  on-secondary-fixed: '#3a0e07'
  on-secondary-fixed-variant: '#e0563f'
  tertiary-fixed: '#f7e6c0'
  tertiary-fixed-dim: '#e8b864'
  on-tertiary-fixed: '#2a1c00'
  on-tertiary-fixed-variant: '#8a6312'
  background: '#f4f6f5'
  on-background: '#14302c'
  surface-variant: '#e8efed'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  display-sm:
    fontFamily: Sora
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Anuphan
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Anuphan
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Anuphan
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  headline-sm:
    fontFamily: Anuphan
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Anuphan
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Anuphan
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Anuphan
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Anuphan
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Anuphan
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Anuphan
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 40px
---

> **Brand note.** The shipping UI brand is **quego** (see the token header in
> [`src/app/globals.css`](../../src/app/globals.css) and the title in
> [`src/app/layout.tsx`](../../src/app/layout.tsx)); "Aura Queue" is the design
> codename for this folder. **The code is the source of truth** — every value in
> the frontmatter above is mirrored 1:1 from the `@theme` block in `globals.css`.
> A rendered, always-current version of this system lives at the in-app route
> **`/design-system`** ([`src/app/design-system/`](../../src/app/design-system)).

## Brand & Style

This design system is built for a high-end booking experience that transforms the mundane act of waiting into a premium service journey. The brand personality is **composed, elite, and welcoming**. It balances the efficiency of a modern SaaS tool with the tactile richness of a luxury concierge service.

The visual style follows a **Modern-Luxury** aesthetic. It uses generous whitespace to create a sense of calm and exclusivity, while a warm accent keeps the interface energetic and responsive. Deep teal surfaces are paired with a coral call-to-action and a gold prestige accent, plus soft gradients—smooth, high-quality, and effortless.

## Colors

The palette is anchored by **Deep Teal** (`#0f766e`), providing a foundation of stability and professional sophistication. **Warm Coral** (`#f97362`) is the accent / primary call-to-action color—warm and human, it pulls the eye straight to the next action. **Soft Gold** (`#c9912f`) is used sparingly as a "prestige" accent—reserved for premium tiers, VIP indicators, and verified badges.

Backgrounds remain predominantly **Cloud** (`#f4f6f5`) or **Clean White** (`#ffffff`) to ensure high contrast and legibility, with text in **Ink** (`#14302c`). Soft gradients (teal → teal, plus a warm gold/coral bleed) are used in headers and hero sections to add depth and modern flair.

- **Primary (Deep Teal `#0f766e`):** Core brand surfaces, headers, and primary buttons.
- **Secondary (Warm Coral `#f97362`):** Primary CTAs, "it's your turn" alerts, and anything that must pull the eye. This is the accent color.
- **Tertiary (Soft Gold `#c9912f`):** Premium / VIP indicators, ratings, and verified badges. (`tertiary-fixed-dim` `#e8b864` is the lighter brand swatch; `tertiary` is the text-safe gold.)
- **Neutral:** Systematic greys ranging from `#f4f6f5` (Background) to `#14302c` (Ink text).

> There is **no purple** in this system. Earlier drafts used a Deep Purple tertiary—it has been fully replaced by Soft Gold.

## Typography

The typography system pairs **Sora** (Latin display / numerals) with **Anuphan** (a Thai-designed family) for all prose.

**Sora** leads the `display` roles—the logo, large queue numbers, and stat figures—giving a geometric, architectural feel that communicates modern luxury. Because Sora carries no Thai glyphs, Thai characters on a Sora line fall through to **Anuphan** per-glyph, keeping mixed-script lines aligned. **Anuphan** carries every Thai heading, body copy, input, and label, ensuring maximum accessibility and clarity in data-dense booking screens.

Both fonts load via `next/font/google` and bind to CSS variables consumed by the `--font-*` tokens in `globals.css` (`--font-display` leads with Sora then Anuphan; `--font-headline` / `--font-body` / `--font-sans` resolve to Anuphan). To maintain an elegant feel, display roles use tight letter-spacing (`-0.01em`) and substantial line-height.

## Layout & Spacing

The system employs a **12-column fluid grid** for desktop and a **single-column vertical stack** for mobile, designed **mobile-first** (base styles target ~375px wide, then enhance up via `min-width`).

A "Generous Whitespace" philosophy is applied by using a 24px gutter (`stack-md`/`gutter`) as the minimum standard for component separation. Sections should be separated by `stack-lg` (40px) to allow the design to "breathe." On desktop, content is centered within a 1280px container (`container-max`) to prevent excessive line lengths and maintain a focused, boutique feel. Screen margins go from 16px (`margin-mobile`) to 48px (`margin-desktop`).

For the booking flow, use a **centered narrow layout** to increase focus and reduce cognitive load during the selection process.

## Elevation & Depth

Hierarchy is established through **brand-tinted shadows** and **tonal layering**—shadows carry the brand color, not neutral grey.

1. **Low elevation (Surface):** Subtle 1px borders in `outline-variant` (`#d5deda`) for static cards.
2. **Medium elevation (Hover / interactive):** `shadow-tinted`—a soft, diffused shadow built from ~18% of the Primary Teal—so elements feel integrated into the brand. `shadow-luxury` (~22% teal, larger radius) is the high-elevation step for modals and active tickets.
3. **Accent glows:** `shadow-gold-glow` (tertiary) for premium elements and `shadow-coral-glow` (secondary) for urgent CTAs.

Premium / VIP items use a **Gold accent** (border or chip) and a slight backdrop blur to differentiate themselves from standard queue items.

## Shapes

The design system uses a **Rounded** shape language with this radius ramp: `sm` 0.25rem, `md` 0.5rem, `lg` 1rem, `xl` 1.5rem, `full` (pill).

- **Action / CTA buttons** are **full pills** (`rounded-full`)—this is the project default for `Button`.
- **Form fields** (input, select, textarea) use `rounded-lg` (1rem).
- **Cards and booking containers** use `rounded-xl` (1.5rem) to emphasize the friendly, approachable nature of the service.
- **Status chips** use a full-round (pill) radius to distinguish them from structural elements.

## Components

> All components below are rendered live from `src/components/` on the
> `/design-system` route. The notes here describe their real token usage.

### Buttons

`Button` defaults to a **full pill** shape; size `md` is `h-11` (44px), the baseline touch target.

- **Primary:** Solid Teal background with White text.
- **Secondary:** White (`surface-container-lowest`) background with a **2px Warm Coral** border and Coral text.
- **Outline:** Transparent background with a 2px `outline-variant` border and Ink text—for low-emphasis neutral actions.
- **Ghost:** Transparent background with Teal text for low-priority actions.
- **Destructive:** Solid Error-red background with White text.

### Input Fields

- Inputs feature a soft background (`surface-container-low`) that transitions to a **White background with a Teal (`primary`) border** on focus. The 2px teal border alone is the focus affordance (no glow ring); its high contrast against the near-white field carries the indicator. Reserve Coral for CTAs and alerts, not field focus.
- Field radius is `rounded-lg`; height is `h-12` (48px).
- Labels are always persistent (top-aligned). Required fields show a red asterisk via the `required` prop (not native HTML `required`); validation runs on submit only.

### Queue Cards

- Cards use `rounded-xl` corners and a soft ambient (tinted) shadow.
- The "Position Number" is displayed in **Sora Bold** at a large scale (`display-lg` / `display-sm`) to be the focal point.

### Status Chips

Chips are pill-shaped, uppercase, and SemiBold. Variants (from the `Chip` component):

- **Waiting:** Transparent with a Teal outline and Teal text.
- **Now Serving:** **Teal → Gold gradient** with White text. (The utility is still legacy-named `bg-teal-purple-gradient`, but it renders `primary → tertiary` = teal → gold.) Pair with a pulse dot for live status.
- **Delayed:** Soft coral background (`secondary-fixed`) with dark coral text.
- **VIP:** Soft gold background (`tertiary-fixed`) with dark gold text.
- **Premium:** Solid Teal background with White text.
- **Confirmed:** Coral container (`secondary-container`) with dark coral text.
- **Success:** Green background (`success`, `#1d9e75`) with White text.
- **Danger:** Error container (`error-container`) with dark red text.

### Progress Indicators

- Linear progress bars use `bg-progress-gradient`—a **Teal → Coral** gradient (`primary → secondary`)—to visualize movement toward the next action.
- `bg-gold-shimmer` (coral → gold → coral, animated) is reserved for premium/celebratory moments.
