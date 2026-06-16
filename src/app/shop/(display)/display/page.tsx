import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopDisplayQueue } from "@/lib/services/shop-display";
import { ShopQueueDisplay } from "./ShopQueueDisplay";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "หน้าจอแสดงคิว · quego",
};

/**
 * The shop's full-screen waiting-room display (OPP-07). Renders today's
 * now-serving + upcoming confirmed queue and a big "เรียกคิวถัดไป" button. The
 * shopId comes from the verified session (never request input); the island then
 * polls the same source the customer position view uses.
 */
export default async function ShopDisplayPage() {
  const session = await requireShopSession();
  const initial = await getShopDisplayQueue(session.shopId);

  return <ShopQueueDisplay initial={initial} shopName={session.shopName} />;
}
