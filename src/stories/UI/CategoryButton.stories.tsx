import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CategoryButton } from "@/components/ui/CategoryButton";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof CategoryButton> = {
  title: "UI/CategoryButton",
  component: CategoryButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "ร้านอาหาร", icon: <Icon name="restaurant" /> },
};
export default meta;

type Story = StoryObj<typeof CategoryButton>;
export const Default: Story = {};
export const Active: Story = { args: { active: true } };

const items = [
  { label: "ร้านอาหาร", icon: "restaurant", active: true },
  { label: "การแพทย์", icon: "medical_services" },
  { label: "ความงาม", icon: "content_cut" },
  { label: "ช้อปปิ้ง", icon: "shopping_bag" },
  { label: "โรงแรม", icon: "hotel" },
  { label: "อื่นๆ", icon: "more_horiz" },
];

export const CategoryStrip: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex gap-6 overflow-x-auto no-scrollbar p-4 bg-surface">
      {items.map((i) => (
        <CategoryButton
          key={i.label}
          label={i.label}
          active={i.active}
          icon={<Icon name={i.icon} />}
        />
      ))}
    </div>
  ),
};
