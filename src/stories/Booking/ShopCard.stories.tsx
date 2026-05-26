import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShopCard } from "@/components/booking/ShopCard";

const meta: Meta<typeof ShopCard> = {
  title: "Booking/ShopCard",
  component: ShopCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    name: "The Gilded Fork",
    imageUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
    distanceLabel: "15m",
    location: "สุขุมวิท, กรุงเทพฯ",
    tags: [
      { label: "อาหารยุโรป", tone: "primary" },
      { label: "มีที่จอดรถ", tone: "secondary" },
    ],
  },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ShopCard>;
export const Default: Story = {};

export const Grid: Story = {
  parameters: { layout: "padded" },
  decorators: [],
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-surface">
      <ShopCard
        name="The Gilded Fork"
        imageUrl="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80"
        rating={4.9}
        distanceLabel="15m"
        location="สุขุมวิท, กรุงเทพฯ"
        tags={[{ label: "อาหารยุโรป" }, { label: "มีที่จอดรถ", tone: "secondary" }]}
      />
      <ShopCard
        name="Lumina Wellness"
        imageUrl="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80"
        rating={4.8}
        distanceLabel="5m"
        location="ทองหล่อ, กรุงเทพฯ"
        tags={[{ label: "คลินิกผิวหนัง" }, { label: "พรีเมียม", tone: "secondary" }]}
      />
      <ShopCard
        name="Velvet Scissors"
        imageUrl="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80"
        rating={5.0}
        distanceLabel="30m"
        location="สยามสแควร์"
        tags={[{ label: "ทำผม" }, { label: "สไตลิสต์ดัง", tone: "secondary" }]}
      />
    </div>
  ),
};
