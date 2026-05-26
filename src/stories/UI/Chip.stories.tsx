import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chip } from "@/components/ui/Chip";

const meta: Meta<typeof Chip> = {
  title: "UI/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { children: "Waiting" },
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "waiting", "now-serving", "delayed", "vip", "premium", "danger"],
    },
    size: { control: "select", options: ["sm", "md"] },
  },
};
export default meta;

type Story = StoryObj<typeof Chip>;
export const Waiting: Story = { args: { variant: "waiting", children: "รอเรียก" } };
export const NowServing: Story = { args: { variant: "now-serving", children: "Now Serving" } };
export const Delayed: Story = { args: { variant: "delayed", children: "เลื่อนเวลา" } };
export const VIP: Story = { args: { variant: "vip", children: "VIP", size: "sm" } };
export const Premium: Story = { args: { variant: "premium", children: "Premium Cafe" } };
export const Danger: Story = { args: { variant: "danger", children: "ยกเลิก" } };
export const WithPulse: Story = {
  args: { variant: "neutral", pulse: true, children: "Pending Review" },
};
export const All: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex gap-2 flex-wrap p-4 bg-surface">
      <Chip variant="waiting">รอเรียก</Chip>
      <Chip variant="now-serving">Now Serving</Chip>
      <Chip variant="delayed">เลื่อนเวลา</Chip>
      <Chip variant="vip" size="sm">VIP</Chip>
      <Chip variant="premium">Premium Cafe</Chip>
      <Chip variant="danger">ยกเลิก</Chip>
      <Chip pulse>กำลังตรวจสอบ</Chip>
    </div>
  ),
};
