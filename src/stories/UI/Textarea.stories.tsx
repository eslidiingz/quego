import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "@/components/ui/Textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    label: "คำอธิบายร้านสั้นๆ",
    placeholder: "บอกเล่าเรื่องราวหรือจุดเด่นของร้านคุณ...",
    rows: 4,
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Textarea>;
export const Default: Story = {};
export const Error: Story = { args: { errorText: "กรุณากรอกคำอธิบายอย่างน้อย 20 ตัวอักษร" } };
