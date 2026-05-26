import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QueueTicket } from "@/components/booking/QueueTicket";

function QueueStatusPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopAppBar title="LuxeQueue" />
      <main className="flex-grow w-full max-w-[800px] mx-auto px-4 md:px-0 py-stack-lg">
        <section className="mb-stack-lg text-center">
          <Chip variant="now-serving" className="mb-2">
            กำลังดำเนินการ (Now Serving)
          </Chip>
          <h2 className="font-display text-headline-lg text-primary mb-2 mt-3">
            ติดตามสถานะคิวของคุณ
          </h2>
          <p className="text-on-surface-variant text-body-md">
            สัมผัสประสบการณ์ระดับพรีเมียมในระหว่างการรอ
          </p>
        </section>
        <QueueTicket number="A-042" waitMinutes={15} remaining={3} progress={75} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card elevation="low">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container">
                <Icon name="storefront" />
              </span>
              <div>
                <h3 className="text-label-md text-primary font-bold">สถานที่</h3>
                <p className="text-body-md text-on-surface">
                  The Luxe Salon &amp; Spa — สาขาสยามพารากอน
                </p>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  ชั้น 4 โซน Luxury Clinic
                </p>
              </div>
            </div>
          </Card>
          <Card elevation="low">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container">
                <Icon name="person_pin" />
              </span>
              <div>
                <h3 className="text-label-md text-primary font-bold">ผู้ให้บริการ</h3>
                <p className="text-body-md text-on-surface">
                  คุณรินรดา (Senior Stylist)
                </p>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Specialist in Modern Aesthetics
                </p>
              </div>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-4 mt-stack-lg">
          <Button size="xl" fullWidth iconLeft={<Icon name="notifications_active" />}>
            แจ้งเตือนเมื่อถึงคิว
          </Button>
          <Button size="xl" variant="destructive" fullWidth>
            ยกเลิกการจองนี้
          </Button>
        </div>
      </main>
    </div>
  );
}

const meta: Meta<typeof QueueStatusPage> = {
  title: "Pages/QueueStatus",
  component: QueueStatusPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof QueueStatusPage>;
export const Customer: Story = {};
