import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof Icon> = {
  title: "UI/Icon",
  component: Icon,
  tags: ["autodocs"],
  args: { name: "spa", size: 32 },
};
export default meta;

type Story = StoryObj<typeof Icon>;
export const Default: Story = {};
export const Filled: Story = { args: { filled: true } };

export const Showcase: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-4 p-4 bg-surface text-primary">
      {[
        "spa", "search", "notifications", "person", "style",
        "store", "monitoring", "settings", "dashboard",
        "campaign", "schedule", "priority_high", "check_circle",
        "hourglass_top", "content_cut", "restaurant", "medical_services",
        "shopping_bag", "hotel", "workspace_premium", "smart_toy",
      ].map((n) => (
        <div key={n} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <Icon name={n} size={28} />
          <code className="text-[10px] text-on-surface-variant">{n}</code>
        </div>
      ))}
    </div>
  ),
};
