import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: { label: "ชื่อร้าน", placeholder: "ระบุชื่อร้านของคุณ" },
  parameters: { layout: "centered" },
  decorators: [(Story) => <div className="w-[420px]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithIconLeft: Story = {
  args: {
    label: "ค้นหา",
    placeholder: "ค้นหาร้าน, บริการ หรือคลินิก...",
    iconLeft: <Icon name="search" />,
  },
};
export const WithIconRight: Story = {
  args: {
    label: "ที่ตั้งร้าน",
    placeholder: "ระบุที่อยู่",
    iconRight: <Icon name="my_location" />,
  },
};
export const HelperText: Story = {
  args: {
    label: "เบอร์โทรศัพท์",
    type: "tel",
    placeholder: "08x-xxx-xxxx",
    helperText: "จะใช้สำหรับการแจ้งเตือนคิวเท่านั้น",
  },
};
export const ErrorState: Story = {
  args: {
    label: "อีเมล",
    type: "email",
    defaultValue: "not-an-email",
    errorText: "รูปแบบอีเมลไม่ถูกต้อง",
  },
};
