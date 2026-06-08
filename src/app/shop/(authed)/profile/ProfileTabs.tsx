"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export type ProfileTab = "info" | "hours" | "notifications" | "security";

const TABS: { key: ProfileTab; label: string; icon: string }[] = [
  { key: "info", label: "ข้อมูลร้าน", icon: "storefront" },
  { key: "hours", label: "เวลาทำการ", icon: "schedule" },
  { key: "notifications", label: "การแจ้งเตือน", icon: "notifications" },
  { key: "security", label: "ความปลอดภัย", icon: "shield" },
];

export function ProfileTabs({ active }: { active: ProfileTab }) {
  return (
    <nav
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
      aria-label="หมวดหมู่ข้อมูลร้าน"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.key === "info" ? "/shop/profile" : `/shop/profile?tab=${tab.key}`}
            scroll={false}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-label-md whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={tab.icon} size={18} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
