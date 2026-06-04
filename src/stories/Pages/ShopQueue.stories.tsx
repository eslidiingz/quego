import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";
import { NowServingCard } from "@/components/booking/NowServingCard";
import { QueueCard } from "@/components/booking/QueueCard";

const sidebarItems = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "queues", label: "Queue Management", icon: "confirmation_number" },
  { key: "shop", label: "Shop Profile", icon: "storefront" },
  { key: "analytics", label: "Analytics", icon: "monitoring" },
  { key: "settings", label: "Settings", icon: "settings" },
];

function ShopQueuePage() {
  const [active, setActive] = React.useState("queues");
  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      <SidebarNav
        className="!flex"
        items={sidebarItems}
        activeKey={active}
        onChange={setActive}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopAppBar title="LuxeQueue" />
        <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-label-md text-secondary uppercase tracking-widest mb-1">
                ยินดีต้อนรับกลับมา
              </p>
              <h1 className="font-display text-headline-lg text-on-background">
                การจัดการคิววันนี้
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-label-sm text-on-surface-variant">สถานะร้าน</span>
                <span className="text-label-md text-primary font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  เปิดให้บริการตามปกติ
                </span>
              </div>
              <Button size="lg" iconLeft={<Icon name="add" />}>
                เพิ่มคิวใหม่
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <NowServingCard
                number="A-024"
                onCallNext={() => undefined}
                onNotify={() => undefined}
              />
            </div>
            <Card className="bg-surface-container">
              <h3 className="text-label-md text-on-surface-variant mb-2">รอในลำดับ</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-display-lg text-on-surface">12</span>
                <span className="text-body-md text-on-surface-variant">ท่าน</span>
              </div>
              <div className="mt-4">
                <ProgressBar label="ความหนาแน่น" value={65} variant="primary" showValue />
              </div>
            </Card>
            <Card className="bg-surface-container-highest">
              <h3 className="text-label-md text-on-surface-variant mb-2">เวลารอโดยประมาณ</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-display-lg text-on-surface">18</span>
                <span className="text-body-md text-on-surface-variant">นาที</span>
              </div>
              <div className="bg-secondary-fixed text-on-secondary-fixed p-3 rounded-lg flex items-center gap-2 mt-3">
                <Icon name="info" size={16} />
                <span className="text-label-sm leading-tight">
                  รักษาระดับเวลาได้ดีกว่าเมื่อวาน 5%
                </span>
              </div>
            </Card>
          </div>
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-headline-md text-on-background">
                รายการคิวที่รอ (3)
              </h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" iconLeft={<Icon name="filter_list" />}>Filter</Button>
                <Button variant="ghost" size="sm" iconLeft={<Icon name="search" />}>Search</Button>
              </div>
            </div>
            <div className="space-y-4">
              <QueueCard
                number="A-25"
                customerName="คุณ วรินทร"
                service="ตัดผมชาย + ทำทรีทเมนต์"
                waitedMinutes={25}
                status="urgent"
                vip
                onCall={() => undefined}
                onSkip={() => undefined}
              />
              <QueueCard
                number="A-26"
                customerName="คุณ กิตติศักดิ์"
                service="ตัดผมชาย"
                waitedMinutes={12}
                onCall={() => undefined}
                onSkip={() => undefined}
              />
              <QueueCard
                number="A-23"
                customerName="คุณ นภัสสร"
                service="สปาผม + ไดร์ผม"
                status="delayed"
                onCall={() => undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const meta: Meta<typeof ShopQueuePage> = {
  title: "Pages/ShopQueue",
  component: ShopQueuePage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ShopQueuePage>;
export const Desktop: Story = {};
