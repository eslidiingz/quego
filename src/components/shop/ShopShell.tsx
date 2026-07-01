"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { QuegoWordmark } from "@/components/ui/QuegoWordmark";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";
import { signOutShop } from "@/app/shop/actions";

// Nav is grouped by how a shop owner actually works through a day, not by raw
// alphabetical/feature order: daily-driver screens first, then the periodic
// review surfaces (reports + expenses, which pair up as the net-profit story),
// then the growth tools we want kept discoverable (sharing would sink to the
// bottom on a pure-frequency sort and get forgotten), then set-once
// configuration last.
const navGroups: {
  label: string;
  items: { href: string; label: string; icon: string }[];
}[] = [
  {
    label: "งานประจำวัน",
    items: [
      { href: "/shop", label: "ภาพรวม", icon: "dashboard" },
      { href: "/shop/bookings", label: "รายการจอง", icon: "event_note" },
      { href: "/shop/customers", label: "ลูกค้า", icon: "contacts" },
      { href: "/shop/display", label: "หน้าจอแสดงคิว", icon: "cast" },
    ],
  },
  {
    label: "สรุป & การเงิน",
    items: [
      { href: "/shop/insights", label: "รายงานร้าน", icon: "insights" },
      { href: "/shop/expenses", label: "ค่าใช้จ่าย", icon: "receipt_long" },
    ],
  },
  {
    label: "เครื่องมือการตลาด",
    items: [
      { href: "/shop/share", label: "แชร์ร้าน", icon: "share" },
    ],
  },
  {
    label: "จัดการร้าน",
    items: [
      { href: "/shop/services", label: "บริการ", icon: "stacks" },
      { href: "/shop/staff", label: "พนักงาน", icon: "group" },
      { href: "/shop/profile", label: "ข้อมูลร้าน", icon: "storefront" },
    ],
  },
];

/**
 * Shell for the authenticated shop area. Mirrors `AdminShell` structurally
 * (sidebar + animated drawer + backdrop) but with shop-scoped nav, profile
 * tile, and logout action.
 *
 * SRP: layout + nav only — domain widgets render inside `children`.
 */
export function ShopShell({
  shopName,
  shopPhone,
  isImpersonating = false,
  headerSlot,
  children,
}: {
  shopName: string;
  shopPhone: string;
  isImpersonating?: boolean;
  /** Optional widget rendered at the right of the sticky header (e.g. the
   *  new-booking notifier). Kept as a slot so the shell stays layout-only. */
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <button
        type="button"
        aria-label="ปิดเมนู"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
        className={cn(
          "lg:hidden fixed inset-0 z-30 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300 ease-out",
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-surface-container-low border-r border-outline-variant shadow-md flex flex-col",
          "transition-transform duration-300 ease-out lg:transition-none",
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-6 py-8 flex items-center">
          <Link href="/">
            <QuegoWordmark />
          </Link>
        </div>
        <div className="px-4 mx-2 mb-6 py-3 bg-surface-container-high rounded-xl flex items-center gap-3">
          <Avatar initials={initials(shopName)} ring="primary" size="lg" />
          <div className="min-w-0">
            <p className="text-label-md text-on-surface font-bold truncate">{shopName}</p>
            <p className="text-label-sm text-on-surface-variant">{shopPhone}</p>
            <span
              className={cn(
                "text-label-sm uppercase font-bold tracking-widest",
                isImpersonating ? "text-error" : "text-secondary",
              )}
            >
              {isImpersonating ? "Admin Mode" : "Shop"}
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-2 flex-1 min-h-0 overflow-y-auto">
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn("flex flex-col gap-1", groupIndex > 0 && "mt-4")}
            >
              <p className="px-6 mx-2 mb-1 text-label-sm uppercase tracking-widest text-on-surface-variant/70">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active =
                  item.href === "/shop"
                    ? pathname === "/shop"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-3 rounded-full transition-all text-left mx-2",
                      active
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-high",
                    )}
                  >
                    <Icon name={item.icon} />
                    <span className="text-label-md">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-4">
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border-2 border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors text-label-md"
              >
                <Icon name="logout" />
                ออกจากระบบ
              </button>
            }
            title="ออกจากระบบหรือไม่?"
            description="คุณจะต้องกรอกเบอร์และรหัส PIN ใหม่เพื่อเข้าสู่ระบบอีกครั้ง"
            confirmLabel="ออกจากระบบ"
            cancelLabel="อยู่ต่อ"
            destructive
            onConfirm={() => signOutShop()}
          />
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-surface/95 backdrop-blur border-b border-outline-variant flex items-center justify-between px-4 md:px-12">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center size-10 rounded-full text-primary hover:bg-surface-container-high transition-colors"
            aria-label="เปิด/ปิดเมนู"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <h1 className="font-display text-headline-md text-on-surface lg:hidden">
            {shopName}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {/* Notifier (the bell) is the right-most item so its `right-0`
                dropdown anchors to the viewport edge and stays on-screen on
                narrow widths — matching the admin shell. */}
            {headerSlot}
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/u);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
