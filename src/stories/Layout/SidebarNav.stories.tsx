import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarNav } from "@/components/layout/SidebarNav";
import React from "react";

const meta: Meta<typeof SidebarNav> = {
  title: "Layout/SidebarNav",
  component: SidebarNav,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SidebarNav>;

const items = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "queues", label: "Queue Management", icon: "confirmation_number" },
  { key: "shop", label: "Shop Profile", icon: "storefront" },
  { key: "analytics", label: "Analytics", icon: "monitoring" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export const Desktop: Story = {
  render: () => {
    const [k, setK] = React.useState("queues");
    return (
      <div className="flex min-h-screen bg-surface">
        <SidebarNav
          items={items}
          activeKey={k}
          onChange={setK}
          className="!flex"
        />
        <main className="flex-1 p-8 text-on-surface-variant">
          เลือกหัวข้อจาก sidebar ด้านซ้าย
        </main>
      </div>
    );
  },
};
