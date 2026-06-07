"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { createMyReview, updateMyReview } from "@/app/me/actions";
import type { BookingReview } from "@/lib/services/reviews";
import { StarRatingInput } from "./StarRatingInput";

const COMMENT_MAX = 1000;

export type WriteReviewButtonProps = {
  bookingId: string;
  shopName: string;
  /** The customer's existing review for this booking, if any. */
  existing: BookingReview | null;
};

/**
 * Entry point for writing / editing a review, shown in a completed booking's
 * footer. Single responsibility: own the review-modal flow (open, validate on
 * submit, call the action, surface the result). The trigger label flips between
 * "เขียนรีวิว" / "แก้ไขรีวิว" based on whether a review exists.
 */
export function WriteReviewButton({
  bookingId,
  shopName,
  existing,
}: WriteReviewButtonProps) {
  const isEdit = existing !== null;
  // A review may be edited only once; once spent, the trigger is disabled.
  const isEdited = existing?.edited === true;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function openModal() {
    // Reset to the latest known state each time the modal opens so a previous
    // aborted edit doesn't linger.
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
    setRatingError(null);
    setSubmitError(null);
    setOpen(true);
  }

  function closeModal() {
    if (pending) return;
    setOpen(false);
  }

  function handleSubmit() {
    // Validation runs ONLY here, on submit — not on blur/keystroke.
    if (rating < 1) {
      setRatingError("กรุณาให้คะแนนอย่างน้อย 1 ดาว");
      return;
    }
    setRatingError(null);
    setSubmitError(null);

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateMyReview(existing.id, rating, comment.trim());
        } else {
          await createMyReview(bookingId, rating, comment.trim());
        }
        setOpen(false);
        setShowSuccess(true);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "บันทึกรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        );
      }
    });
  }

  return (
    <>
      {/* The edit is spent once used — hide the trigger entirely. The Modal/Toast
          below still render so the post-edit success toast can appear. */}
      {!isEdited ? (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={openModal}
          iconLeft={<Icon name={isEdit ? "edit" : "rate_review"} size={18} />}
        >
          {isEdit ? "แก้ไขรีวิว" : "เขียนรีวิว"}
        </Button>
      ) : null}

      <Modal
        open={open}
        onClose={closeModal}
        title={isEdit ? "แก้ไขรีวิว" : "เขียนรีวิว"}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={pending}
            >
              บันทึกรีวิว
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-body-md text-on-surface-variant">
            รีวิวร้าน{" "}
            <span className="font-semibold text-on-surface">{shopName}</span>
          </p>

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container"
            >
              <Icon name="error" size={18} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-label-md text-on-surface-variant">
              ให้คะแนน
              <RequiredMark />
            </span>
            <StarRatingInput
              value={rating}
              onChange={(v) => {
                setRating(v);
                // Clear the error as soon as the user corrects the field.
                if (ratingError) setRatingError(null);
              }}
              disabled={pending}
            />
            {ratingError ? (
              <p role="alert" className="text-label-sm text-error">
                {ratingError}
              </p>
            ) : null}
          </div>

          <Textarea
            label="ความคิดเห็น (ไม่บังคับ)"
            placeholder="เล่าประสบการณ์ของคุณกับร้านนี้..."
            rows={4}
            maxLength={COMMENT_MAX}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={pending}
            helperText={`${comment.length}/${COMMENT_MAX}`}
          />
        </div>
      </Modal>

      {showSuccess ? (
        <Toast
          kind="success"
          message="บันทึกรีวิวเรียบร้อยแล้ว"
          onDismiss={() => setShowSuccess(false)}
        />
      ) : null}
    </>
  );
}
