import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PinInput } from "@/components/ui/PinInput";

const meta: Meta<typeof PinInput> = {
  title: "UI/PinInput",
  component: PinInput,
  tags: ["autodocs"],
  args: { label: "รหัส PIN", required: true, maxDigits: 6 },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PinInput>;

export const Default: Story = {};

export const Filled: Story = {
  args: { defaultValue: "1234", visible: true },
};

export const Masked: Story = {
  args: { defaultValue: "123456" },
};

export const ErrorState: Story = {
  args: { defaultValue: "12", errorText: "รหัส PIN ต้องเป็นตัวเลข 6 หลัก" },
};

export const Disabled: Story = {
  args: { defaultValue: "123456", disabled: true },
};
