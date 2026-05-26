"use client";

import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { stopImpersonation } from "@/app/shop/actions";

/**
 * Sticky warning ribbon shown above the shop UI whenever the active shop
 * session was minted by an admin (impersonation). Provides a single,
 * unmissable exit affordance so the admin can return to /admin in one click
 * without going through the full PIN logout flow.
 *
 * SRP: render the banner + bind the exit action. The "am I impersonating?"
 * decision is made upstream in the server layout, which only mounts this
 * component when the flag is set.
 */
export function ImpersonationBanner({ shopName }: { shopName: string }) {
  const [pending, startTransition] = useTransition();

  const handleExit = () => {
    startTransition(async () => {
      await stopImpersonation();
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-secondary-container text-on-secondary-container border-b border-secondary/30 shadow-sm"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="admin_panel_settings" size={20} />
          <p className="text-label-md font-bold truncate">
            กำลังสวมรอยเป็นร้าน &ldquo;{shopName}&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={handleExit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-on-secondary-container/15 hover:bg-on-secondary-container/25 disabled:opacity-60 transition-colors text-label-sm font-bold"
        >
          {pending ? (
            <Icon name="progress_activity" size={16} className="animate-spin" />
          ) : (
            <Icon name="logout" size={16} />
          )}
          {pending ? "กำลังออก..." : "ออกจากการสวมรอย"}
        </button>
      </div>
    </div>
  );
}
