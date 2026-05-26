import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch } from "@/components/ui/Switch";

const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "เปิดให้บริการ" },
};
export default meta;

type Story = StoryObj<typeof Switch>;
export const On: Story = { args: { defaultChecked: true } };
export const Off: Story = {};
export const Group: Story = {
  render: () => (
    <div className="space-y-3 w-[280px]">
      <Switch defaultChecked label="แจ้งเตือนผ่าน Push" />
      <Switch defaultChecked label="แจ้งเตือนผ่าน SMS" />
      <Switch label="โหมดประหยัดข้อมูล" />
    </div>
  ),
};
