import "server-only";
import { cache } from "react";
import { listServicesByShop } from "./services";
import { listBusinessHours } from "./business-hours";
import { countActiveStaff } from "./staff";
import { getShopOnboardingFlags } from "./shops";
import {
  buildSetupChecklist,
  type SetupChecklist,
} from "@/lib/shop/setup-checklist";

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

export type ShopOnboarding = {
  checklist: SetupChecklist;
  /** ISO timestamp, or null if the owner has never seen the guided tour. */
  tourSeenAt: string | null;
};

/**
 * Everything the shop area needs to know about a shop's onboarding, in one
 * `cache()`-memoized fan-out.
 *
 * The `(authed)` layout asks for the blocking step and the tour flag, and the
 * dashboard asks for the full checklist — memoizing here means those two share
 * a single round of reads per request instead of doubling them.
 */
export const getShopOnboarding = cache(
  async (shopId: string): Promise<ShopOnboarding> => {
    const [services, hours, flags, activeStaff] = await Promise.all([
      listServicesByShop(shopId),
      listBusinessHours(shopId),
      getShopOnboardingFlags(shopId),
      countActiveStaff(shopId),
    ]);

    const checklist = buildSetupChecklist({
      // Any service counts, matching the long-standing behaviour of the
      // blocking modal. (A shop whose whole catalogue is toggled off is in fact
      // un-bookable but shows no blocker — a pre-existing gap, tracked
      // separately; "fixing" it here would start nagging shops that paused on
      // purpose.)
      hasService: services.length > 0,
      hasOpenDay: hours.some((h) => h.isOpen),
      hasLocationPin: flags?.hasLocationPin ?? false,
      hasLogo: flags?.hasLogo ?? false,
      hasActiveStaff: activeStaff > 0,
    });

    return { checklist, tourSeenAt: flags?.tourSeenAt ?? null };
  },
);

/** The full activation checklist, for the dashboard card. */
export async function getShopSetupChecklist(
  shopId: string,
): Promise<SetupChecklist> {
  const { checklist } = await getShopOnboarding(shopId);
  return checklist;
}

/**
 * Resolve the next setup step a shop must complete, or `null` when it is ready
 * to take bookings. Surfaced one step at a time and in order: a shop with no
 * services is not bookable at all, so that comes first; only once at least one
 * service exists do we check business hours (all days closed = never
 * configured, the `listBusinessHours` default for a shop with no rows).
 *
 * Now a thin projection of {@link getShopOnboarding} — same contract as before,
 * so the focus modal is untouched.
 */
export async function getShopSetupStep(
  shopId: string,
): Promise<ShopSetupStep | null> {
  const { checklist } = await getShopOnboarding(shopId);
  const task = checklist.blockingTask;
  if (!task) return null;

  return {
    key: task.key,
    icon: task.icon,
    title: task.title,
    description: task.description,
    ctaLabel: task.ctaLabel,
    ctaHref: task.ctaHref,
  };
}
