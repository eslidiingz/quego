import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { getCustomerStampCards } from "@/lib/services/promotions";
import { StampCards } from "./StampCards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "บัตรสะสมแต้มของฉัน · Quego",
};

export default async function MyRewardsPage() {
  const session = await requireCustomerSession();

  const stampCards = await getCustomerStampCards(session.phone);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <PageHeader
        eyebrow="บัตรสะสมแต้ม"
        title="บัตรสะสมแต้มของฉัน"
        description="สะสมแต้มกับร้านที่คุณใช้บริการ ใช้บริการครบตามที่ร้านกำหนดรับสิทธิ์ได้เลย"
      />

      {stampCards.length > 0 ? (
        <StampCards cards={stampCards} />
      ) : (
        <div className="border-2 border-dashed border-outline-variant rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-3 bg-surface-container-lowest">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-container-low text-on-surface-variant">
            <Icon name="card_giftcard" size={28} />
          </span>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            ยังไม่มีบัตรสะสมแต้ม — เมื่อคุณใช้บริการกับร้านที่มีบัตรสะสมแต้ม
            บัตรจะปรากฏที่นี่
          </p>
        </div>
      )}
    </div>
  );
}
