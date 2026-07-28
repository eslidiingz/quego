"use client";

import { CopyField } from "@/components/ui/CopyField";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const LINE_STEPS = [
  "เข้า LINE Official Account Manager แล้วเลือกร้านของคุณ",
  "ไปที่เมนู “ริชเมนู” (Rich menu) แล้วสร้างหรือแก้ไขเมนู",
  "เลือกปุ่มที่ต้องการ แล้วตั้งค่าการกระทำเป็น “ลิงก์” (Link)",
  "วางลิงก์ที่คัดลอกไว้ แล้วตั้งชื่อปุ่ม เช่น “จองคิว”",
  "บันทึกและเปิดใช้งานริชเมนู",
];

const CARD =
  "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6";

/** Filename-safe slug from the shop name for the QR download. */
function slugify(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/giu, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "shop";
}

/**
 * The shop-facing share toolkit: copy the shop link, download a QR of it, copy
 * a direct booking link, and read how to drop the link into a LINE OA rich
 * menu. Pure presentation — every URL + the QR image are resolved on the
 * server and handed in as props (SRP: this renders, it does not fetch).
 */
export function ShareTools({
  shopUrl,
  bookingUrl,
  qrDataUrl,
  walkInUrl,
  walkInQrDataUrl,
  shopName,
}: {
  shopUrl: string;
  bookingUrl: string;
  qrDataUrl: string;
  /** OPP-08: in-shop walk-in self-join deep link + its QR. */
  walkInUrl: string;
  walkInQrDataUrl: string;
  shopName: string;
}) {
  const downloadQr = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-stack-md">
      {/* Shop link + its QR — primary share target, bundled in one card like
          the in-shop check-in section below. */}
      <section data-tour={TOUR_ANCHORS.shareShopQr} className={CARD}>
        <h2 className="text-label-lg font-bold text-on-surface mb-1 flex items-center gap-2">
          <Icon name="qr_code_2" size={20} className="text-primary" />
          QR และลิงก์ร้านของคุณ
        </h2>
        <p className="text-label-md text-on-surface-variant mb-4">
          ให้ลูกค้าสแกน QR หรือแชร์ลิงก์เพื่อเปิดหน้าร้านและจองคิว
          เหมาะกับโพสต์โซเชียลหรือป้ายในร้าน
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-outline-variant bg-white p-4">
            {/* Plain <img>: the QR is a server-generated data-URL, so next/image
                optimisation does not apply. Mirrors the Avatar pattern. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR code สำหรับ ${shopName}`}
              width={200}
              height={200}
              className="size-[200px]"
            />
          </div>
          <Button
            type="button"
            onClick={() =>
              downloadQr(qrDataUrl, `quego-qr-${slugify(shopName)}.png`)
            }
            iconLeft={<Icon name="download" size={18} />}
            className="w-full sm:w-auto"
          >
            ดาวน์โหลด QR
          </Button>
        </div>
        <div data-tour={TOUR_ANCHORS.shareShopUrl} className="mt-4">
          <CopyField value={shopUrl} id="share-shop-url" />
        </div>
      </section>

      {/* OPP-08: in-shop walk-in QR — print and post at the counter so customers
          self-join today's queue (phone + service, no login). */}
      <section data-tour={TOUR_ANCHORS.shareWalkIn} className={CARD}>
        <h2 className="text-label-lg font-bold text-on-surface mb-1 flex items-center gap-2">
          <Icon name="storefront" size={20} className="text-primary" />
          QR เช็คอินหน้าร้าน
        </h2>
        <p className="text-label-md text-on-surface-variant mb-4">
          พิมพ์แล้ววางไว้ที่หน้าร้าน ลูกค้าสแกนเพื่อเข้าคิวว่างที่เร็วที่สุดของวันนี้ได้เอง
          โดยไม่ต้องเข้าสู่ระบบ
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-outline-variant bg-white p-4">
            {/* Plain <img>: server-generated data-URL, so next/image
                optimisation does not apply. Mirrors the shop QR above. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={walkInQrDataUrl}
              alt={`QR เช็คอินหน้าร้านสำหรับ ${shopName}`}
              width={200}
              height={200}
              className="size-[200px]"
            />
          </div>
          <Button
            type="button"
            onClick={() =>
              downloadQr(
                walkInQrDataUrl,
                `quego-walkin-${slugify(shopName)}.png`,
              )
            }
            iconLeft={<Icon name="download" size={18} />}
            className="w-full sm:w-auto"
          >
            ดาวน์โหลด QR เช็คอิน
          </Button>
        </div>
        <div className="mt-4">
          <CopyField value={walkInUrl} id="share-walkin-url" />
        </div>
      </section>

      {/* Direct booking link — secondary, for a "จองคิว" rich-menu button */}
      <section data-tour={TOUR_ANCHORS.shareBookingUrl} className={CARD}>
        <h2 className="text-label-lg font-bold text-on-surface mb-1 flex items-center gap-2">
          <Icon name="event_available" size={20} className="text-primary" />
          ลิงก์จองคิวโดยตรง
        </h2>
        <p className="text-label-md text-on-surface-variant mb-4">
          พาลูกค้าไปยังหน้าจองทันที เหมาะกับปุ่ม “จองคิว” ในเมนู LINE
        </p>
        <CopyField value={bookingUrl} id="share-booking-url" />
      </section>

    </div>
  );
}
