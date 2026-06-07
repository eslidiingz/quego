"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
};

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={className}>
      <div
        className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-full text-label-md whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-6">{activeContent}</div>
    </div>
  );
}
