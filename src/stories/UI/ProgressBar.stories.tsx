import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressBar } from "@/components/ui/ProgressBar";

const meta: Meta<typeof ProgressBar> = {
  title: "UI/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { value: 65 },
  argTypes: {
    variant: { control: "select", options: ["primary", "gradient", "gold", "luxury"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ProgressBar>;

export const Primary: Story = { args: { variant: "primary" } };
export const Gradient: Story = {
  args: { variant: "gradient", label: "ความคืบหน้า", showValue: true, value: 75 },
};
export const Gold: Story = { args: { variant: "gold", value: 85 } };
export const SystemHealth: Story = {
  render: () => (
    <div className="space-y-5 w-[480px]">
      <ProgressBar label="Server Load" value={24} variant="luxury" showValue />
      <ProgressBar label="API Latency" value={15} variant="luxury" showValue />
      <ProgressBar label="Queue Traffic" value={85} variant="gold" />
    </div>
  ),
};
