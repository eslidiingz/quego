import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "@/components/ui/Avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { initials: "TK", size: "md" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    ring: { control: "select", options: ["none", "primary", "secondary"] },
    status: { control: "select", options: [undefined, "online", "offline", "away"] },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;
export const Initials: Story = {};
export const WithRing: Story = { args: { ring: "secondary", size: "lg" } };
export const WithStatus: Story = { args: { status: "online", size: "lg" } };
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar initials="S" size="sm" />
      <Avatar initials="M" size="md" />
      <Avatar initials="L" size="lg" ring="primary" />
      <Avatar initials="XL" size="xl" ring="secondary" status="online" />
    </div>
  ),
};
