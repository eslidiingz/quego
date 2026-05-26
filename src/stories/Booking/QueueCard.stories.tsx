import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueueCard } from "@/components/booking/QueueCard";

const meta: Meta<typeof QueueCard> = {
  title: "Booking/QueueCard",
  component: QueueCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    number: "A-26",
    customerName: "คุณ กิตติศักดิ์",
    service: "จองสำหรับ: ตัดผมชาย",
    waitedMinutes: 12,
    onCall: () => undefined,
    onSkip: () => undefined,
  },
  decorators: [(Story) => <div className="w-full max-w-3xl"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof QueueCard>;

export const Standard: Story = {};
export const UrgentVip: Story = {
  args: {
    number: "A-25",
    customerName: "คุณ วรินทร",
    service: "ตัดผมชาย + ทำทรีทเมนต์",
    waitedMinutes: 25,
    status: "urgent",
    vip: true,
  },
};
export const Delayed: Story = {
  args: {
    number: "A-23",
    customerName: "คุณ นภัสสร",
    service: "สปาผม + ไดร์ผม",
    status: "delayed",
    onSkip: undefined,
  },
};

export const QueueList: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-3xl">
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
        service="จองสำหรับ: ตัดผมชาย"
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
  ),
};
