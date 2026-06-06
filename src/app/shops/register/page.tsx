import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { QuevaWordmark } from "@/components/ui/QuevaWordmark";
import { listActiveCategories } from "@/lib/services/shops";
import { ShopRegistrationForm } from "./ShopRegistrationForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "สมัครเป็นร้าน · queva",
  description:
    "เพิ่มร้านของคุณเข้าสู่ระบบ queva เพื่อให้ลูกค้าจองคิวได้สะดวกขึ้น",
};

export default async function ShopRegisterPage() {
  const categories = await listActiveCategories();
  const taxonomyReady = categories.length > 0;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="w-full sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
        <div className="max-w-[1280px] mx-auto px-4 md:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <QuevaWordmark />
          </Link>
          <Link
            href="/"
            className="text-label-md text-on-surface-variant hover:text-primary transition-colors"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </header>

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-8 py-stack-lg">
        <div className="text-center mb-stack-lg">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/30 text-on-secondary-container text-label-sm uppercase tracking-widest mb-3">
            <Icon name="workspace_premium" size={16} />
            สำหรับร้าน
          </span>
          <h1 className="font-display text-headline-lg text-on-background mb-2">
            สมัครเป็นร้านใน queva
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            กรอกข้อมูลด้านล่างเพื่อให้ทีมงานตรวจสอบ
            เราจะติดต่อกลับภายใน 1–2 วันทำการเพื่อยืนยันร้านของคุณ
          </p>
        </div>

        {taxonomyReady ? (
          <ShopRegistrationForm categories={categories} />
        ) : (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
            <Icon
              name="schedule"
              size={32}
              className="text-on-surface-variant mb-3 mx-auto block"
            />
            <p className="text-body-md text-on-surface">
              ระบบยังไม่พร้อมรับสมัครในขณะนี้
            </p>
            <p className="text-label-md text-on-surface-variant mt-1">
              กำลังจัดเตรียมหมวดหมู่ธุรกิจ กรุณากลับมาใหม่ภายหลัง
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
