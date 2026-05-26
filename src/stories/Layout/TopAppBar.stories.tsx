import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof TopAppBar> = {
  title: "Layout/TopAppBar",
  component: TopAppBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof TopAppBar>;

export const Default: Story = {
  args: {
    rightSlot: (
      <>
        <button className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant">
          <Icon name="notifications" />
        </button>
        <Avatar initials="TK" ring="primary" />
      </>
    ),
  },
};

export const BackButton: Story = {
  args: {
    title: "สมัครเป็นร้าน",
    onBack: () => undefined,
    showLogo: false,
  },
};
