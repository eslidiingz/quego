"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";

/**
 * Customer sign-out control. Exists as a `"use client"` island so the
 * `ConfirmDialog` (a client component composing its trigger via
 * `cloneElement`) is constructed entirely inside a client boundary — the
 * customer layout is a Server Component, and rendering `ConfirmDialog` with a
 * JSX `trigger` prop directly from the server breaks SSR.
 *
 * DIP: the actual sign-out work is injected via `onSignOut` (a server action),
 * so this component stays UI-only and persona-agnostic.
 */
export function SignOutButton({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md font-semibold"
        >
          <Icon name="logout" size={18} />
          <span className="hidden sm:inline">ออกจากระบบ</span>
        </button>
      }
      title="ออกจากระบบหรือไม่?"
      description="คุณจะต้องเข้าสู่ระบบใหม่เพื่อกลับมาดูคิวของคุณอีกครั้ง"
      confirmLabel="ออกจากระบบ"
      cancelLabel="อยู่ต่อ"
      destructive
      onConfirm={onSignOut}
    />
  );
}
