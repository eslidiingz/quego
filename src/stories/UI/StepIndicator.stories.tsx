import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepIndicator } from "@/components/ui/StepIndicator";

const meta: Meta<typeof StepIndicator> = {
  title: "UI/StepIndicator",
  component: StepIndicator,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    steps: [
      { label: "ข้อมูลร้าน" },
      { label: "การยืนยันตัวตน" },
      { label: "บริการ" },
    ],
    currentStep: 1,
  },
  decorators: [(Story) => <div className="w-[640px]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof StepIndicator>;

export const Step1: Story = { args: { currentStep: 1 } };
export const Step2: Story = { args: { currentStep: 2 } };
export const Step3: Story = { args: { currentStep: 3 } };
