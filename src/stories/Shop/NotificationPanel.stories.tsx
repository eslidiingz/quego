import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NotificationPanel } from "@/components/shop/NotificationPanel";

const meta: Meta<typeof NotificationPanel> = {
  title: "Shop/NotificationPanel",
  component: NotificationPanel,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof NotificationPanel>;

export const WithItems: Story = {
  args: {
    items: [
      {
        id: "1",
        customerName: "นิก",
        slotTime: "14:30",
        bookingDate: "2026-06-03",
        createdAt: "2026-06-03T07:30:00.000Z",
      },
      {
        id: "2",
        customerName: "อาร์ม",
        slotTime: "15:00",
        bookingDate: "2026-06-03",
        createdAt: "2026-06-03T07:25:00.000Z",
      },
      {
        id: "3",
        customerName: "โอ๊ต",
        slotTime: "09:00",
        bookingDate: "2026-06-05",
        createdAt: "2026-06-03T07:20:00.000Z",
      },
    ],
  },
};

export const Empty: Story = {
  args: { items: [] },
};
