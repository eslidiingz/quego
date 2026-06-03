import Link from "next/link";
import { cn } from "@/lib/cn";

export type LoginTabKey = "customer" | "shop";

const tabs: { key: LoginTabKey; label: string }[] = [
  { key: "customer", label: "ทั่วไป" },
  { key: "shop", label: "ร้าน" },
];

/**
 * Pill-style tab nav for the unified login. Each tab is a plain link that
 * flips the `?tab=` param so server-side `LoginPage` re-renders the right
 * form. SRP: nav only, no form/business logic.
 */
export function LoginTabs({ active }: { active: LoginTabKey }) {
  return (
    <nav
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant mb-6"
      aria-label="เลือกประเภทผู้ใช้"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/login?tab=${tab.key}`}
            scroll={false}
            className={cn(
              "flex-1 px-4 py-2 rounded-full text-label-md text-center whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
