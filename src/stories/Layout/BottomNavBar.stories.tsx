import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { Icon } from "@/components/ui/Icon";
import React from "react";

const meta: Meta<typeof BottomNavBar> = {
  title: "Layout/BottomNavBar",
  component: BottomNavBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "iphone6" } },
};
export default meta;

type Story = StoryObj<typeof BottomNavBar>;

const items = [
  { key: "explore", label: "สำรวจ", icon: <Icon name="search" /> },
  { key: "queues", label: "คิวของฉัน", icon: <Icon name="style" /> },
  { key: "activity", label: "กิจกรรม", icon: <Icon name="notifications" /> },
  { key: "profile", label: "โปรไฟล์", icon: <Icon name="person" /> },
];

export const Mobile: Story = {
  render: () => {
    const [k, setK] = React.useState("explore");
    return (
      <div className="min-h-screen bg-surface relative flex items-center justify-center text-on-surface-variant">
        <p>Bottom nav on mobile</p>
        <BottomNavBar
          items={items}
          activeKey={k}
          onChange={setK}
          className="!lg:flex"
        />
      </div>
    );
  },
};
