"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { approveShop } from "./actions";

/**
 * SRP: shows a confirm modal for shop approval and dispatches the action.
 * Mirrors RejectShopDialog's controlled-modal pattern.
 */
export function ApproveShopDialog({
  open,
  onClose,
  shopId,
  shopName,
  reapproval,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  /** True when the shop was previously rejected/suspended. */
  reapproval?: boolean;
  onResult: (ok: boolean, message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveShop(shopId);
      if (result.ok) {
        onResult(true, result.message);
        onClose();
      } else {
        setError(result.message);
        onResult(false, result.message);
      }
    });
  };

  const title = reapproval
    ? `อนุมัติร้าน "${shopName}" อีกครั้ง`
    : `อนุมัติร้าน "${shopName}"`;

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      size="sm"
    >
      <p className="text-body-md text-on-surface">
        ร้านนี้จะปรากฏให้ลูกค้าค้นหาเจอทันทีหลังจากอนุมัติ
      </p>
      {error ? (
        <div
          role="alert"
          className="mt-4 text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      ) : null}
      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
          fullWidth
          className="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          fullWidth
          className="flex-1"
          iconLeft={
            pending ? (
              <Icon name="progress_activity" className="animate-spin" />
            ) : (
              <Icon name="check_circle" />
            )
          }
        >
          {pending ? "กำลังบันทึก..." : "ยืนยันอนุมัติ"}
        </Button>
      </div>
    </Modal>
  );
}
