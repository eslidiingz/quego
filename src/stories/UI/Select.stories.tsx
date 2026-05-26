import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select } from "@/components/ui/Select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "ประเภทธุรกิจ" },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <option value="">เลือกประเภทธุรกิจ</option>
      <option value="restaurant">ร้านอาหาร (Restaurant)</option>
      <option value="spa">สปาและนวด (Spa)</option>
      <option value="clinic">คลินิกเสริมความงาม (Clinic)</option>
      <option value="salon">ร้านทำผม (Salon)</option>
    </Select>
  ),
};
