import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatCard } from "@/components/ui/StatCard";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof StatCard> = {
  title: "UI/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    label: "ร้านทั้งหมด (Total Shops)",
    value: "1,248",
    icon: <Icon name="store" />,
    trend: { value: "+4", direction: "up", tone: "primary" },
  },
};
export default meta;

type Story = StoryObj<typeof StatCard>;
export const Shops: Story = {};
export const UsersGold: Story = {
  args: {
    label: "ผู้ใช้ทั้งหมด (Total Users)",
    value: "45.2K",
    iconTint: "secondary",
    icon: <Icon name="group" />,
    trend: { value: "+128", direction: "up", tone: "secondary" },
  },
};
export const BentoGrid: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-surface">
      <StatCard label="ร้านทั้งหมด" value="1,248" icon={<Icon name="store" />} trend={{ value: "+4", direction: "up" }} />
      <StatCard label="ผู้ใช้ทั้งหมด" value="45.2K" iconTint="secondary" icon={<Icon name="group" />} trend={{ value: "+128", direction: "up", tone: "secondary" }} />
      <StatCard label="คะแนนความพึงพอใจ" value="98.2%" iconTint="tertiary" icon={<Icon name="favorite" />} trend={{ value: "+1.4%", direction: "up" }} />
    </div>
  ),
};
