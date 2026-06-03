---
name: Aura Queue
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f484a'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f797b'
  outline-variant: '#bec8ca'
  surface-tint: '#156874'
  primary: '#00464f'
  on-primary: '#ffffff'
  primary-container: '#005f6b'
  on-primary-container: '#90d6e4'
  inverse-primary: '#8bd2df'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#5e009f'
  on-tertiary: '#ffffff'
  tertiary-container: '#7829bc'
  on-tertiary-container: '#e1bdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#2ecc71'
  on-success: '#ffffff'
  success-container: '#b8f3c2'
  on-success-container: '#00210d'
  primary-fixed: '#a7eefc'
  primary-fixed-dim: '#8bd2df'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004e59'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#f1dbff'
  tertiary-fixed-dim: '#deb7ff'
  on-tertiary-fixed: '#2d0050'
  on-tertiary-fixed-variant: '#680eac'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
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

## Brand & Style

This design system is built for a high-end booking experience that transforms the mundane act of waiting into a premium service journey. The brand personality is **composed, elite, and welcoming**. It balances the efficiency of a modern SaaS tool with the tactile richness of a luxury concierge service.

The visual style follows a **Modern-Luxury** aesthetic. It utilizes generous whitespace to create a sense of calm and exclusivity, while vibrant accents ensure the interface feels energetic and responsive. By mixing deep, jewel-toned surfaces with metallic accents and soft gradients, the UI evokes a sense of "digital velvet"—smooth, high-quality, and effortless.

## Colors

The palette is anchored by **Deep Teal**, providing a foundation of stability and professional sophistication. **Metallic Gold** is used sparingly as a "prestige" accent—reserved for high-priority actions, luxury tier indicators, and active states. 

To maintain a "Vibrant" feel, a **Deep Purple** is introduced as a tertiary color for notifications and specialized status updates. Backgrounds remain predominantly **Clean White** or very light grey to ensure high contrast and legibility, while soft gradients (Teal to Purple) are used in headers and hero sections to add depth and modern flair.

- **Primary (Deep Teal):** Core brand actions and primary buttons.
- **Secondary (Gold):** Highlights, borders for active selection, and premium iconography.
- **Tertiary (Purple):** Accents for movement, time indicators, and "Now Serving" alerts.
- **Neutral:** Systematic greys ranging from `#F8F9FA` (Surface) to `#1A1A1A` (Text).

## Typography

The typography system pairs **Montserrat** for headlines with **Inter** for functional text. 

**Montserrat** provides a geometric, architectural feel that communicates modern luxury. It should be used for high-level headings and prominent queue numbers. **Inter** is utilized for all body copy, inputs, and labels to ensure maximum accessibility and clarity in data-dense booking screens. 

To maintain the "Elegant" feel, headlines use tight letter-spacing and substantial line-height, creating a structured, editorial look.

## Layout & Spacing

The system employs a **12-column fluid grid** for desktop and a **single-column vertical stack** for mobile. 

A "Generous Whitespace" philosophy is applied by using a 24px gutter as the minimum standard for component separation. Sections should be separated by `stack-lg` (40px) to allow the design to "breathe." On desktop, content is centered within a 1280px container to prevent excessive line lengths and maintain a focused, boutique feel. 

For the booking flow, use a **centered narrow layout** (spanning 6-8 columns) to increase focus and reduce cognitive load during the selection process.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

1.  **Low Elevation (Surface):** Subtle 1px borders in Light Grey (`#E0E0E0`) for static cards.
2.  **Medium Elevation (Hover/Interactive):** Soft, diffused shadows with a 15% opacity of the Primary Teal color. This "tinted shadow" makes elements feel integrated into the brand.
3.  **High Elevation (Modals/Active Tickets):** Deep, large-radius shadows (Blur 30px) that make elements appear to float gracefully above the background.

Active items or "Now Serving" tickets use a **Gold Border (2px)** and a very slight backdrop blur to differentiate themselves from the standard queue items.

## Shapes

The design system uses a **Rounded (Level 2)** shape language. This provides a 0.5rem (8px) base radius for standard buttons and input fields.

Larger components like cards and booking containers use `rounded-lg` (1rem / 16px) or `rounded-xl` (1.5rem / 24px) to emphasize the friendly and approachable nature of the service. Interactive "pills" for status chips use a full-round (500px) radius to distinguish them from structural elements.

## Components

### Buttons
- **Primary:** Solid Teal background with White text. High-contrast and bold.
- **Secondary (Luxury):** White background with a 2px Gold border and Gold text.
- **Ghost:** Transparent background with Teal text for low-priority actions.

### Input Fields
- Inputs feature a soft-grey background (`#F1F3F5`) that transitions to a **White background with a Gold border** on focus. 
- Labels are always persistent (top-aligned) to ensure accessibility.

### Queue Cards
- Cards utilize `rounded-lg` corners and a soft ambient shadow. 
- The "Position Number" is displayed in **Montserrat Bold** at a large scale (Display-LG) to be the focal point.

### Status Chips
- **Waiting:** Teal outline.
- **Now Serving:** Gradient background (Teal to Purple) with White text.
- **Delayed:** Soft Gold background with Dark Brown text for high-contrast warning.
- **Completed / Success:** Green background (`success`, #2ecc71) with White text.

### Progress Indicators
- Linear progress bars should use a **Teal-to-Gold gradient** to visualize the journey toward the "Golden" service moment.