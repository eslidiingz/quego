"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { createMyReview } from "@/app/me/actions";
import type { BookingReview } from "@/lib/services/reviews";
import { StarRatingInput } from "./StarRatingInput";
import { StarRatingDisplay } from "./StarRatingDisplay";

const COMMENT_MAX = 1000;

export type WriteReviewButtonProps = {
  bookingId: string;
  shopName: string;
  /** The customer's existing review for this booking, if any. */
  existing: BookingReview | null;
};

/**
 * Review entry point in a completed booking's footer. Reviews are FINAL once
 * submitted, so this has two mutually-exclusive states:
 *   • not reviewed yet → a "เขียนรีวิว" button that opens the create modal.
 *   • already reviewed → a read-only star summary, with no edit affordance.
 *
 * The create flow lives in its own component so this wrapper can early-return
 * the read-only branch without conditionally calling hooks.
 */
export function WriteReviewButton({
  bookingId,
  shopName,
  existing,
}: WriteReviewButtonProps) {
  if (existing) {
    return (
      <span className="inline-flex items-center gap-2 h-11 text-label-md font-semibold text-on-surface-variant">
        <Icon name="reviews" size={18} className="text-tertiary" />
        รีวิวของคุณ
        <StarRatingDisplay value={existing.rating} size={18} />
      </span>
    );
  }

  return <CreateReviewFlow bookingId={bookingId} shopName={shopName} />;
}

/** The "เขียนรีวิว" button + modal. Validates on submit only, then creates. */
function CreateReviewFlow({
  bookingId,
  shopName,
}: {
  bookingId: string;
  shopName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function openModal() {
    // Reset each open so an aborted attempt doesn't linger.
    setRating(0);
    setComment("");
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
        await createMyReview(bookingId, rating, comment.trim());
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
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={openModal}
        iconLeft={<Icon name="rate_review" size={18} />}
      >
        เขียนรีวิว
      </Button>

      <Modal
        open={open}
        onClose={closeModal}
        title="เขียนรีวิว"
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
