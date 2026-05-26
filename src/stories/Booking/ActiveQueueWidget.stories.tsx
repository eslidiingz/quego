import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActiveQueueWidget } from "@/components/booking/ActiveQueueWidget";

const meta: Meta<typeof ActiveQueueWidget> = {
  title: "Booking/ActiveQueueWidget",
  component: ActiveQueueWidget,
  tags: ["autodocs"],
  args: { position: "04", shopName: "Emerald Spa", queuesAhead: 2, progress: 75 },
};
export default meta;

type Story = StoryObj<typeof ActiveQueueWidget>;
export const Default: Story = { args: { onClose: () => undefined } };
export const NoClose: Story = {};
