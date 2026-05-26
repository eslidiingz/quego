import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    elevation: { control: "select", options: ["flat", "low", "medium", "high"] },
  },
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  args: { elevation: "low" },
  render: (args) => (
    <Card {...args} className="w-[420px]">
      <CardHeader>
        <Icon name="store" className="text-primary" />
        <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-body-md text-on-surface-variant">
          ใช้สำหรับจัดกลุ่มข้อมูลหรือฟอร์มที่เกี่ยวข้องกัน รองรับ 4 ระดับเงา ตั้งแต่
          แบนเรียบไปจนถึงเงาหรูระดับ floating modal.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Elevations: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-surface">
      {(["flat", "low", "medium", "high"] as const).map((e) => (
        <Card key={e} elevation={e} className="text-center">
          <p className="text-label-sm uppercase tracking-wider text-primary">{e}</p>
          <p className="text-body-md text-on-surface-variant mt-2">
            elevation = {e}
          </p>
        </Card>
      ))}
    </div>
  ),
};

export const Glass: Story = {
  parameters: { backgrounds: { default: "container" } },
  render: () => (
    <div className="bg-luxury-gradient p-12 rounded-xl w-[480px]">
      <Card asGlass elevation="medium">
        <CardTitle className="mb-2">Glass surface</CardTitle>
        <p className="text-body-md text-on-surface-variant">
          ใช้สำหรับการ์ดที่ลอยอยู่เหนือพื้นหลังภาพ/ไล่ระดับ
        </p>
      </Card>
    </div>
  ),
};
