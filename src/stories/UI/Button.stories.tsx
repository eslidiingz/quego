import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "จองคิวทันที" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    rounded: { control: "select", options: ["md", "lg", "xl", "full"] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = {
  args: { variant: "secondary", children: "ดูเพิ่มเติม" },
};
export const Outline: Story = { args: { variant: "outline", children: "บันทึก" } };
export const Ghost: Story = { args: { variant: "ghost", children: "ยกเลิก" } };
export const Destructive: Story = {
  args: { variant: "destructive", children: "ยกเลิกการจอง" },
};

export const WithIcons: Story = {
  args: {
    variant: "primary",
    iconLeft: <Icon name="notifications_active" />,
    iconRight: <Icon name="chevron_right" />,
    children: "แจ้งเตือนเมื่อถึงคิว",
  },
};

export const PillCTA: Story = {
  args: {
    variant: "primary",
    size: "xl",
    rounded: "full",
    children: "ส่งข้อมูลการสมัคร",
    iconRight: <Icon name="chevron_right" />,
  },
};

export const AllVariants: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col gap-8 p-6 bg-surface">
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} className="flex items-center flex-wrap gap-3">
          <span className="text-label-sm uppercase text-on-surface-variant w-12">{size}</span>
          <Button size={size} variant="primary">Primary</Button>
          <Button size={size} variant="secondary">Secondary</Button>
          <Button size={size} variant="outline">Outline</Button>
          <Button size={size} variant="ghost">Ghost</Button>
          <Button size={size} variant="destructive">Destructive</Button>
        </div>
      ))}
    </div>
  ),
};
