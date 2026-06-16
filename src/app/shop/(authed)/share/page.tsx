import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopById } from "@/lib/services/shops";
import { absoluteUrl } from "@/lib/url";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { ShareTools } from "./ShareTools";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "แชร์ร้าน · quego",
};

export default async function ShopSharePage() {
  const session = await requireShopSession();
  const shop = await getShopById(session.shopId);

  if (!shop) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  const shopUrl = absoluteUrl(`/shops/${shop.id}`);
  const bookingUrl = absoluteUrl(`/shops/${shop.id}/book`);
  // OPP-08: the in-shop walk-in self-join deep link — printed and posted at the
  // counter so customers scan to join today's queue themselves.
  const walkInUrl = absoluteUrl(`/shops/${shop.id}/walk-in`);
  // Server-side PNG data-URLs; rendered as <img> and reused for the download.
  const [qrDataUrl, walkInQrDataUrl] = await Promise.all([
    QRCode.toDataURL(shopUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    }),
    QRCode.toDataURL(walkInUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    }),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-3xl mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="โปรโมตร้าน"
        title="แชร์ร้าน"
        badge={
          <Chip variant="premium" size="sm">
            เปิดให้บริการ
          </Chip>
        }
        description="คัดลอกลิงก์หรือดาวน์โหลด QR เพื่อให้ลูกค้าจองคิว และนำไปติดในเมนู LINE ของร้าน"
      />

      <ShareTools
        shopUrl={shopUrl}
        bookingUrl={bookingUrl}
        qrDataUrl={qrDataUrl}
        walkInUrl={walkInUrl}
        walkInQrDataUrl={walkInQrDataUrl}
        shopName={shop.name}
      />
    </div>
  );
}
