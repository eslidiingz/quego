import type { IconProps } from "@/components/ui/Icon";

/**
 * Customer-area primary destinations, shared by the desktop top-bar nav
 * (in {@link MeLayout}) and the mobile bottom tab bar ({@link CustomerBottomNav}) so
 * the two can never drift apart. Plain data module — no `"use client"` / no
 * `server-only` — so both the Server Component layout and the client bottom bar
 * can import it.
 */
export type MeNavItem = {
  href: string;
  label: string;
  icon: IconProps["name"];
};

export const ME_NAV_ITEMS: readonly MeNavItem[] = [
  { href: "/", label: "หน้าหลัก", icon: "home" },
  { href: "/me/bookings", label: "คิวของฉัน", icon: "confirmation_number" },
  { href: "/me/waitlist", label: "คิวรอ", icon: "manage_history" },
  { href: "/me/rewards", label: "แต้มสะสม", icon: "stars" },
  { href: "/me/profile", label: "โปรไฟล์", icon: "person" },
];
