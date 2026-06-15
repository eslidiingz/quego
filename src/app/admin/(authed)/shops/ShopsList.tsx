"use client";

import { useState, useTransition } from "react";
import { Toast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { CategoryOption, ShopListItem } from "@/lib/services/shops";
import { ShopApplicationCard } from "./ShopCard";
import { EditShopDialog } from "./EditShopDialog";
import { startImpersonation } from "./actions";

type ToastState = { kind: "success" | "error"; message: string } | null;

/**
 * Owns the local state for the admin shops page: toast feedback and which
 * row has an edit / impersonate dialog open. Card renders are stateless and
 * delegate via callbacks (DIP). There is no moderation — registration is
 * self-serve — so the admin can only view, edit, or impersonate a shop.
 */
export function ShopsList({
  rows,
  categories,
}: {
  rows: ShopListItem[];
  categories: CategoryOption[];
}) {
  const [editTarget, setEditTarget] = useState<ShopListItem | null>(null);
  const [impersonateTarget, setImpersonateTarget] =
    useState<ShopListItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [impersonating, startImpersonateTransition] = useTransition();

  const showToast = (kind: NonNullable<ToastState>["kind"], message: string) => {
    setToast({ kind, message });
  };

  const confirmImpersonate = () => {
    if (!impersonateTarget) return;
    const target = impersonateTarget;
    startImpersonateTransition(async () => {
      try {
        await startImpersonation(target.id);
      } catch (err) {
        // NEXT_REDIRECT errors flow through useTransition; only a real
        // failure (e.g. the shop got un-approved between render and click)
        // lands here.
        console.error(err);
        setImpersonateTarget(null);
        showToast("error", "ไม่สามารถเข้าใช้งานเป็นร้านนี้ได้");
      }
    });
  };

  if (rows.length === 0) {
    return <EmptyState />;
  }

  const pendingId = editTarget?.id ?? impersonateTarget?.id ?? null;

  return (
    <div className="space-y-4">
      {toast ? (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      {rows.map((shop) => (
        <ShopApplicationCard
          key={shop.id}
          shop={shop}
          pending={pendingId === shop.id}
          onEdit={(s) => setEditTarget(s)}
          onImpersonate={(s) => setImpersonateTarget(s)}
        />
      ))}

      {editTarget ? (
        <EditShopDialog
          open={editTarget !== null}
          onClose={() => setEditTarget(null)}
          shop={editTarget}
          categories={categories}
          onResult={(ok, msg) => showToast(ok ? "success" : "error", msg)}
        />
      ) : null}

      <Modal
        open={impersonateTarget !== null}
        onClose={impersonating ? () => undefined : () => setImpersonateTarget(null)}
        title="เข้าใช้งานในฐานะร้านนี้?"
        size="sm"
      >
        <div className="space-y-3 text-body-md text-on-surface-variant">
          <p>
            คุณกำลังจะเข้าใช้งานระบบในฐานะร้าน
            {" "}
            <span className="font-bold text-on-surface">
              &ldquo;{impersonateTarget?.name}&rdquo;
            </span>
            {" "}
            การกระทำใด ๆ ในระหว่างนี้จะถูกบันทึกในชื่อของร้าน
          </p>
          <p className="text-label-md">
            ระบบจะแสดงแถบเตือนตลอดเวลาที่คุณอยู่ในโหมดสวมรอย
            สามารถออกได้ทันทีโดยกดปุ่มในแถบเตือน
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setImpersonateTarget(null)}
            disabled={impersonating}
            fullWidth
            className="flex-1"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={confirmImpersonate}
            disabled={impersonating}
            fullWidth
            className="flex-1"
            iconLeft={
              impersonating ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="domino_mask" />
              )
            }
          >
            {impersonating ? "กำลังเข้าสู่ระบบ..." : "เข้าใช้งาน"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="storefront" size={32} />
      </div>
      <p className="text-body-md text-on-surface">ยังไม่มีร้านในระบบ</p>
      <p className="text-label-md text-on-surface-variant mt-1">
        ร้านจะปรากฏที่นี่เมื่อมีการสมัครเข้ามา
      </p>
    </div>
  );
}
