"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";
import type { TourStep } from "@/lib/tour/types";

/**
 * The coachmark bubble itself: step copy, a position counter, and the
 * back/next/skip controls.
 *
 * SRP: presentation only. It knows nothing about anchors, geometry, or which
 * tour is running — `TourOverlay` positions it and owns the step state.
 */
export function TourCard({
  step,
  body,
  stepIndex,
  stepCount,
  onPrev,
  onNext,
  onSkip,
  onCtaClick,
}: {
  step: TourStep;
  /** Already resolved to `body` or `fallbackBody` by the overlay. */
  body: string;
  stepIndex: number;
  stepCount: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onCtaClick: () => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2
          id="tour-card-title"
          className="font-display text-headline-sm text-on-surface"
        >
          {step.title}
        </h2>
        <span
          aria-live="polite"
          className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant tabular-nums"
        >
          {stepIndex + 1}/{stepCount}
        </span>
      </div>

      <p
        id="tour-card-body"
        className="mt-2 text-body-sm text-on-surface-variant"
      >
        {body}
      </p>

      {step.cta ? (
        <Link
          href={step.cta.href}
          onClick={onCtaClick}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: "mt-4 w-full",
          })}
        >
          {step.cta.label}
          <Icon name="arrow_forward" size={16} />
        </Link>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-2 py-1 text-label-sm text-on-surface-variant transition-colors duration-200 ease-out hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          ข้าม
        </button>
        <div className="flex items-center gap-2">
          {isFirst ? null : (
            <button
              type="button"
              onClick={onPrev}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              ย้อนกลับ
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            {isLast ? "เสร็จสิ้น" : "ถัดไป"}
          </button>
        </div>
      </div>
    </>
  );
}
