import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ChangePinForm,
  type ChangePinState,
} from "@/components/ui/ChangePinForm";

const ok = async (): Promise<ChangePinState> => ({ ok: true });
const wrongCurrent = async (): Promise<ChangePinState> => ({
  ok: false,
  message: "รหัส PIN เดิมไม่ถูกต้อง",
  fieldErrors: { currentPin: "รหัส PIN เดิมไม่ถูกต้อง" },
});

const meta: Meta<typeof ChangePinForm> = {
  title: "UI/ChangePinForm",
  component: ChangePinForm,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[420px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChangePinForm>;

export const Default: Story = { args: { action: ok } };
export const WrongCurrentPin: Story = { args: { action: wrongCurrent } };
