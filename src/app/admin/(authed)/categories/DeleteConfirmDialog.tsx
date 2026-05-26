"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { deleteCategory } from "./actions";

export function DeleteConfirmDialog({
  open,
  onClose,
  categoryId,
  categoryName,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  onResult: (ok: boolean, message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (result?.ok) {
        onResult(true, result.message ?? "ลบเรียบร้อย");
        onClose();
      } else {
        const message = result?.message ?? "ลบไม่สำเร็จ";
        setError(message);
        onResult(false, message);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title="ยืนยันการลบ"
      size="sm"
    >
      <p className="text-body-md text-on-surface">
        ต้องการลบหมวดหมู่{" "}
        <span className="font-bold text-error">{categoryName}</span> หรือไม่?
      </p>
      <p className="text-label-sm text-on-surface-variant mt-2">
        การลบจะมีผลทันทีและไม่สามารถกู้คืนได้
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
          variant="outline"
          onClick={onClose}
          disabled={pending}
          type="button"
          fullWidth
          className="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={pending}
          fullWidth
          className="flex-1"
          iconLeft={
            pending ? (
              <Icon name="progress_activity" className="animate-spin" />
            ) : (
              <Icon name="delete" />
            )
          }
        >
          {pending ? "กำลังลบ..." : "ลบหมวดหมู่"}
        </Button>
      </div>
    </Modal>
  );
}
