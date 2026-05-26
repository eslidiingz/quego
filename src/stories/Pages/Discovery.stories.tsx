import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CategoryButton } from "@/components/ui/CategoryButton";
import { ShopCard } from "@/components/booking/ShopCard";
import { ActiveQueueWidget } from "@/components/booking/ActiveQueueWidget";

const categories = [
  { label: "ร้านอาหาร", icon: "restaurant", active: true },
  { label: "การแพทย์", icon: "medical_services" },
  { label: "ความงาม", icon: "content_cut" },
  { label: "ช้อปปิ้ง", icon: "shopping_bag" },
  { label: "โรงแรม", icon: "hotel" },
  { label: "อื่นๆ", icon: "more_horiz" },
];

function DiscoveryPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <TopAppBar
        rightSlot={
          <>
            <button className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant">
              <Icon name="notifications" />
            </button>
            <Avatar initials="TK" ring="primary" />
          </>
        }
      />
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-12">
        <section className="mt-stack-lg mb-stack-lg">
          <div className="text-center mb-8">
            <h2 className="font-display text-headline-lg text-on-surface mb-2">
              ยกระดับการรอคอยของคุณ
            </h2>
            <p className="text-body-lg text-on-surface-variant">
              ค้นหาบริการระดับพรีเมียมและจองคิวได้ทันที
            </p>
          </div>
          <div className="max-w-2xl mx-auto relative">
            <Input
              iconLeft={<Icon name="search" />}
              placeholder="ค้นหาร้าน, บริการ หรือคลินิก..."
              className="pr-32 h-14 rounded-xl"
            />
            <Button className="absolute right-3 top-1/2 -translate-y-1/2">ค้นหา</Button>
          </div>
        </section>
        <section className="mb-stack-lg overflow-x-auto no-scrollbar">
          <div className="flex gap-6 min-w-max py-2">
            {categories.map((c) => (
              <CategoryButton
                key={c.label}
                label={c.label}
                active={c.active}
                icon={<Icon name={c.icon} />}
              />
            ))}
          </div>
        </section>
        <section className="mb-stack-lg">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="font-display text-headline-md text-on-background">ยอดนิยมใกล้คุณ</h3>
              <p className="text-label-md text-on-surface-variant">
                ร้านแนะนำที่ได้รับความนิยมสูงสุดในขณะนี้
              </p>
            </div>
            <button className="text-primary text-label-md flex items-center hover:underline">
              ดูทั้งหมด
              <Icon name="chevron_right" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </section>
      </main>
      <div className="fixed bottom-24 right-4 md:right-8 z-40">
        <ActiveQueueWidget
          position="04"
          shopName="Emerald Spa"
          queuesAhead={2}
          progress={75}
          onClose={() => undefined}
        />
      </div>
      <BottomNavBar
        activeKey="explore"
        items={[
          { key: "explore", label: "สำรวจ", icon: <Icon name="search" /> },
          { key: "queues", label: "คิวของฉัน", icon: <Icon name="style" /> },
          { key: "activity", label: "กิจกรรม", icon: <Icon name="notifications" /> },
          { key: "profile", label: "โปรไฟล์", icon: <Icon name="person" /> },
        ]}
      />
    </div>
  );
}

const meta: Meta<typeof DiscoveryPage> = {
  title: "Pages/Discovery",
  component: DiscoveryPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof DiscoveryPage>;
export const Customer: Story = {};
