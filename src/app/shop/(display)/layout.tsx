import {
  getShopDisplaySession,
  requireShopSession,
} from "@/lib/auth/shop-session-server";
import { Icon } from "@/components/ui/Icon";
import { ShopTourProvider } from "@/components/tour/ShopTourProvider";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import { Button } from "@/components/ui/Button";
import {
  exitDisplayModeAction,
  startDisplayModeAction,
} from "./display/display-mode-actions";

/**
 * Chrome-free layout for the shop waiting-room DISPLAY (`/shop/display`, OPP-07).
 *
 * Deliberately NOT `ShopShell` — the kiosk runs on a tablet propped up in the
 * waiting room, so there is no sidebar, header, or nav: just a full-height
 * surface for the queue.
 *
 * Auth (audit M4): the kiosk runs on a narrow display token, never the owner
 * session. An owner who opens this page without one sees a "start display mode"
 * panel; starting it swaps the owner cookie for the display token on this
 * device. The corner exit drops the token and sends the device to the shop
 * login, so getting back to the owner area needs the PIN.
 */
export const dynamic = "force-dynamic";

export default async function ShopDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const display = await getShopDisplaySession();
  if (!display) {
    const owner = await requireShopSession();
    return <StartDisplayMode shopName={owner.shopName} />;
  }

  return (
    // This route group is a sibling of `(authed)`, so it is outside that
    // layout's provider and needs its own for the `?` button to work here.
    <ShopTourProvider>
      <div className="relative min-h-screen bg-background">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <TourHelpButton tourId="shop-display" />
          <form action={exitDisplayModeAction}>
            <button
              type="submit"
              data-tour={TOUR_ANCHORS.displayExit}
              aria-label="ออกจากโหมดจอแสดงผล"
              title="ออกจากโหมดจอแสดงผล (ต้องเข้าสู่ระบบด้วย PIN อีกครั้ง)"
              className="inline-flex items-center justify-center rounded-full border border-outline-variant bg-surface/80 p-2 text-on-surface-variant backdrop-blur transition-colors hover:bg-surface-container-high"
            >
              <Icon name="close" size={18} />
            </button>
          </form>
        </div>
        {children}
      </div>
    </ShopTourProvider>
  );
}

function StartDisplayMode({ shopName }: { shopName: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-outline-variant bg-surface p-6">
        <div className="flex items-center gap-2 text-on-surface">
          <Icon name="cast" />
          <h1 className="text-headline-sm font-semibold">เปิดหน้าจอแสดงคิว</h1>
        </div>
        <p className="text-body-md text-on-surface-variant">
          ใช้เครื่องนี้เป็นจอแสดงคิวของร้าน “{shopName}” สำหรับวางให้ลูกค้าดู
        </p>
        <ul className="list-disc space-y-1 pl-5 text-label-md text-on-surface-variant">
          <li>เครื่องนี้จะออกจากระบบจัดการร้าน เพื่อไม่ให้ลูกค้าเข้าถึงข้อมูลร้าน</li>
          <li>จอแสดงคิวเรียกคิวถัดไปได้อย่างเดียว ใช้งานได้ 12 ชั่วโมง</li>
          <li>กลับไปจัดการร้านได้โดยกดปิดมุมขวาบน แล้วเข้าสู่ระบบด้วย PIN</li>
        </ul>
        <form action={startDisplayModeAction}>
          <Button type="submit" className="w-full" iconLeft={<Icon name="cast" />}>
            เริ่มโหมดจอแสดงคิว
          </Button>
        </form>
        <a
          href="/shop"
          className="block text-center text-label-md text-on-surface-variant underline"
        >
          กลับไปหน้าจัดการร้าน
        </a>
      </div>
    </div>
  );
}
