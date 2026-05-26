"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Icon } from "@/components/ui/Icon";
import { rejectShop } from "./actions";

/**
 * Modal that collects a rejection reason and submits.
 * SRP: focused on the rejection flow — collects reason, calls the action.
 * DIP: the persistence call is delegated to the server action passed in via
 * import; this component knows nothing about Supabase.
 */
export function RejectShopDialog({
  open,
  onClose,
  shopId,
  shopName,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  onResult: (ok: boolean, message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleClose = () => {
    if (pending) return;
    setReason("");
    setReasonError(null);
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }
    if (trimmed.length < 10) {
      setReasonError("เหตุผลควรมีอย่างน้อย 10 ตัวอักษร");
      return;
    }
    setReasonError(null);
    setSubmitError(null);

    startTransition(async () => {
      const result = await rejectShop(shopId, trimmed);
      if (result.ok) {
        onResult(true, result.message);
        setReason("");
        onClose();
      } else {
        setSubmitError(result.message);
        onResult(false, result.message);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`ปฏิเสธร้าน: ${shopName}`}
      size="md"
    >
      <p className="text-body-md text-on-surface-variant mb-4">
        เหตุผลที่ระบุจะถูกส่งให้ผู้สมัครเพื่อให้ทราบสาเหตุและสามารถแก้ไขกลับมาสมัครใหม่ได้
      </p>
      <Textarea
        label="เหตุผลในการปฏิเสธ"
        required
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="ระบุเหตุผล เช่น เอกสารไม่ครบ, ข้อมูลไม่ตรง, ฯลฯ"
        errorText={reasonError ?? undefined}
        disabled={pending}
        maxLength={500}
      />
      {submitError ? (
        <div
          role="alert"
          className="mt-4 text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
        >
          {submitError}
        </div>
      ) : null}
      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={pending}
          fullWidth
          className="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleSubmit}
          disabled={pending}
          fullWidth
          className="flex-1"
          iconLeft={
            pending ? (
              <Icon name="progress_activity" className="animate-spin" />
            ) : (
              <Icon name="block" />
            )
          }
        >
          {pending ? "กำลังบันทึก..." : "ยืนยันปฏิเสธ"}
        </Button>
      </div>
    </Modal>
  );
}
