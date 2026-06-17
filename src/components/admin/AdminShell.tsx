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
import { signOutAdmin } from "@/app/admin/actions";

const navItems = [
  { href: "/admin", label: "ภาพรวม", icon: "dashboard" },
  { href: "/admin/shops", label: "ร้านในระบบ", icon: "storefront" },
  { href: "/admin/categories", label: "หมวดหมู่ร้าน", icon: "category" },
  { href: "/admin/presets", label: "บริการ preset", icon: "stacks" },
  { href: "/admin/audit", label: "บันทึกการกระทำ", icon: "history" },
];

export function AdminShell({
  adminName,
  adminPhone,
  children,
}: {
  adminName: string;
  adminPhone: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Backdrop: always rendered so opacity can transition. `pointer-events-none`
          when closed lets clicks pass through to the page underneath. */}
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
      {/* Sidebar: always rendered as flex column; slides off-screen with translate.
          Avoids `hidden`/`display:none` which can't be transitioned. */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-surface-container-low border-r border-outline-variant shadow-md flex flex-col",
          "transition-transform duration-300 ease-out lg:transition-none",
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-6 py-8 flex items-center">
          <QuegoWordmark />
        </div>
        <div className="px-4 mx-2 mb-6 py-3 bg-surface-container-high rounded-xl flex items-center gap-3">
          <Avatar initials={initials(adminName)} ring="primary" size="lg" />
          <div className="min-w-0">
            <p className="text-label-md text-on-surface font-bold truncate">{adminName}</p>
            <p className="text-label-sm text-on-surface-variant">{adminPhone}</p>
            <span className="text-label-sm uppercase font-bold text-secondary tracking-widest">
              Admin
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
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
            description="คุณจะต้องกรอกเบอร์และรหัสผ่านใหม่เพื่อกลับเข้าหน้าผู้ดูแล"
            confirmLabel="ออกจากระบบ"
            cancelLabel="อยู่ต่อ"
            destructive
            onConfirm={() => signOutAdmin()}
          />
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-surface/95 backdrop-blur border-b border-outline-variant flex items-center justify-between px-4 md:px-12">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center size-10 rounded-full hover:bg-surface-container-low text-primary"
            aria-label="เปิด/ปิดเมนู"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <h1 className="font-display text-headline-md text-on-surface lg:hidden">
            Quego Admin
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
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
