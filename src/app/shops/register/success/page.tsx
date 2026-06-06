import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "ส่งใบสมัครสำเร็จ · queva",
};

type SearchParams = Promise<{ id?: string }>;

export default async function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { id } = await searchParams;
  const reference = id ? id.slice(0, 8).toUpperCase() : null;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary-container/20 text-primary flex items-center justify-center mb-6 shadow-tinted">
          <Icon name="check_circle" filled size={48} />
        </div>
        <h1 className="font-display text-headline-lg text-primary mb-2">
          ส่งใบสมัครเรียบร้อย
        </h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          เราได้รับข้อมูลร้านของคุณแล้ว ทีมงานจะตรวจสอบและติดต่อกลับ
          ภายใน 1–2 วันทำการ
        </p>

        {reference ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">
              รหัสอ้างอิงใบสมัคร
            </p>
            <p className="font-display font-bold text-headline-md text-secondary tracking-wider">
              LQ-{reference}
            </p>
            <p className="text-label-sm text-on-surface-variant mt-2">
              เก็บรหัสนี้ไว้ใช้สอบถามสถานะกับทีมงาน
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Link href="/">
            <Button fullWidth size="xl" iconLeft={<Icon name="home" />}>
              กลับสู่หน้าแรก
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
