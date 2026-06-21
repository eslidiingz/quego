import "server-only";
import { cache } from "react";
import { listServicesByShop } from "./services";
import { listBusinessHours } from "./business-hours";

/**
 * The one outstanding first-run setup step that blocks a shop from taking
 * bookings, as a self-describing descriptor the UI can render directly (modal +
 * reminder card share it, so their copy/CTA can never drift). `key` lets the
 * client decide which destination page to suppress the modal on.
 */
export type ShopSetupStep = {
  key: "services" | "hours";
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Resolve the next setup step a shop must complete, or `null` when it is ready
 * to take bookings. Surfaced one step at a time and in order: a shop with no
 * services is not bookable at all, so that comes first; only once at least one
 * service exists do we check business hours (all days closed = never
 * configured, the `listBusinessHours` default for a shop with no rows).
 *
 * `cache()`-memoized per request so the `(authed)` layout (global modal) and the
 * dashboard (reminder card) can both ask without doubling the DB reads.
 */
export const getShopSetupStep = cache(
  async (shopId: string): Promise<ShopSetupStep | null> => {
    const [services, hours] = await Promise.all([
      listServicesByShop(shopId),
      listBusinessHours(shopId),
    ]);

    if (services.length === 0) {
      return {
        key: "services",
        icon: "stacks",
        title: "ยังไม่มีบริการในร้าน",
        description:
          "เพิ่มบริการอย่างน้อย 1 รายการก่อน ลูกค้าจึงจะจองคิวเข้าร้านได้",
        ctaLabel: "เพิ่มบริการ",
        ctaHref: "/shop/services",
      };
    }

    if (hours.every((h) => !h.isOpen)) {
      return {
        key: "hours",
        icon: "schedule",
        title: "ยังไม่ได้ตั้งเวลาเปิด-ปิดร้าน",
        description: "ตั้งเวลาทำการเพื่อให้ระบบสร้างช่วงเวลาให้ลูกค้าจองได้",
        ctaLabel: "ตั้งเวลาทำการ",
        ctaHref: "/shop/profile?tab=hours",
      };
    }

    return null;
  },
);
