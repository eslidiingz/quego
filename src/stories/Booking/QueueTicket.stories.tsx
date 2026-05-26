import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueueTicket } from "@/components/booking/QueueTicket";

const meta: Meta<typeof QueueTicket> = {
  title: "Booking/QueueTicket",
  component: QueueTicket,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { number: "A-042", waitMinutes: 15, remaining: 3, progress: 75 },
  decorators: [(Story) => <div className="w-full max-w-2xl"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof QueueTicket>;
export const Default: Story = {};
