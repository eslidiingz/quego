import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NowServingCard } from "@/components/booking/NowServingCard";

const meta: Meta<typeof NowServingCard> = {
  title: "Booking/NowServingCard",
  component: NowServingCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { number: "A-024", onCallNext: () => undefined, onNotify: () => undefined },
  decorators: [(Story) => <div className="w-full max-w-2xl"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof NowServingCard>;
export const Default: Story = {};
