"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { CustomerSort } from "@/lib/services/customer-crm";

/**
 * Search + sort controls for the customer directory. Client-only because it
 * drives URL query params (`?q=&sort=`) via the router — the server page reads
 * them and re-queries. Search is submit-only (Enter / the button), never on
 * keystroke; changing the sort keeps the CURRENTLY APPLIED query (the prop),
 * not whatever half-typed text is in the box.
 */

const SORTS: { key: CustomerSort; label: string }[] = [
  { key: "recent", label: "มาล่าสุด" },
  { key: "spend", label: "ใช้จ่ายสูงสุด" },
  { key: "visits", label: "มาบ่อยสุด" },
  { key: "name", label: "ชื่อ ก-ฮ" },
];

export function CustomerListControls({
  q,
  sort,
}: {
  q: string;
  sort: CustomerSort;
}) {
  const router = useRouter();
  const [value, setValue] = useState(q);

  const go = (nextQ: string, nextSort: CustomerSort) => {
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextSort !== "recent") params.set("sort", nextSort);
    const qs = params.toString();
    router.push(qs ? `/shop/customers?${qs}` : "/shop/customers");
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value, sort);
        }}
        className="flex gap-2"
        noValidate
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Icon name="search" size={20} />
          </span>
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ค้นหาด้วยชื่อหรือเบอร์โทร"
            aria-label="ค้นหาลูกค้า"
            className="w-full rounded-full border-2 border-transparent bg-surface-container-high py-2.5 pl-11 pr-4 text-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:bg-surface-container-highest focus:outline-none"
          />
        </div>
        <Button type="submit" size="md" iconLeft={<Icon name="search" />}>
          ค้นหา
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={s.key === sort}
            onClick={() => go(q, s.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-label-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              s.key === sort
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
            )}
          >
            {s.label}
          </button>
        ))}
        {q ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              go("", sort);
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-label-sm font-semibold text-error transition-colors hover:bg-error-container/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon name="close" size={14} />
            ล้างการค้นหา
          </button>
        ) : null}
      </div>
    </div>
  );
}
