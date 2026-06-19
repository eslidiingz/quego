"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import {
  ImageCropDialog,
  type ImageCropShape,
} from "@/components/ui/ImageCropDialog";
import {
  IMAGE_ACCEPT,
  MAX_LOGO_BYTES,
  MAX_COVER_BYTES,
} from "@/lib/validation/media";

export type ImageUploadFieldProps = {
  /** Image alt text + the control aria-labels (e.g. "โลโก้ร้าน"). Not shown as a visible heading — the parent composes labels/captions. */
  label: string;
  shape: ImageCropShape;
  /** Crop aspect ratio passed straight to the crop dialog. */
  aspect: number;
  /** Currently-saved image URL (or an optimistic preview), or null when empty. */
  currentUrl: string | null;
  /** What to render when there is no image — injected so this field stays generic. */
  fallback: React.ReactNode;
  /** Title shown on the crop dialog ("ปรับโลโก้" / "ปรับรูปปก"). */
  cropTitle: string;
  busy?: boolean;
  /** Server/validation error for THIS slot, surfaced inline (never a native alert). */
  error?: string;
  /** Extra classes for the media box (e.g. a ring when the logo overlaps a cover). */
  mediaClassName?: string;
  onPick: (file: File) => void;
};

/**
 * Canonical extension per produced mime. The crop dialog yields WebP (or PNG if
 * a browser can't encode WebP and canvas.toBlob falls back); the server
 * re-sniffs the bytes regardless, so this is only for a tidy filename/type.
 */
const EXT_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** Per-shape source-file size cap (checked on pick, before cropping). */
const MAX_SOURCE_BYTES: Record<ImageCropShape, number> = {
  round: MAX_LOGO_BYTES,
  rect: MAX_COVER_BYTES,
};

function megabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

/**
 * SRP: one image slot. Picks a source file, crops it via ImageCropDialog, and
 * hands the cropped File up through `onPick` — it never knows about the server
 * action, the shop, or which slot it is (logo vs cover is just `shape`/`aspect`/
 * filename). Reusable for both slots (DIP: the action is injected as the
 * `onPick` callback).
 *
 * Facebook-style: the camera (add/change) control is OVERLAID on the media at
 * the bottom-right, on a non-clipped wrapper so the round shape never crops it
 * off. This avoids a controls-below-media row, which would otherwise collide
 * with the logo↔cover overlap the parent composes. There is no remove control
 * by design — an uploaded image can be replaced but never cleared back to the
 * placeholder.
 */
export function ImageUploadField({
  label,
  shape,
  aspect,
  currentUrl,
  fallback,
  cropTitle,
  busy = false,
  error,
  mediaClassName,
  onPick,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  // Revoke the object URL whenever it changes or the field unmounts so the
  // chosen source blob doesn't leak.
  useEffect(() => {
    if (!pickedSrc) return;
    return () => URL.revokeObjectURL(pickedSrc);
  }, [pickedSrc]);

  const openPicker = () => {
    if (busy) return;
    setPickError(null);
    inputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still fires `change`.
    e.target.value = "";
    if (!file) return;

    // Validate on pick (the only "submit" before cropping): size + accept type.
    const maxBytes = MAX_SOURCE_BYTES[shape];
    if (file.size > maxBytes) {
      setPickError(`ไฟล์ใหญ่เกินไป (สูงสุด ${megabytes(maxBytes)} MB)`);
      return;
    }
    if (!IMAGE_ACCEPT.split(",").includes(file.type)) {
      setPickError("รองรับเฉพาะไฟล์รูปภาพ PNG, JPG, WEBP หรือ AVIF");
      return;
    }

    setPickError(null);
    setPickedSrc(URL.createObjectURL(file));
  };

  const closeDialog = () => {
    setPickedSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleConfirm = (blob: Blob) => {
    // Trust the produced blob's type (WebP normally; PNG on a fallback). The
    // server re-sniffs the bytes, so name/type here are only for tidiness.
    const type = blob.type || "image/webp";
    const ext = EXT_BY_TYPE[type] ?? "webp";
    const base = shape === "round" ? "logo" : "cover";
    onPick(new File([blob], `${base}.${ext}`, { type }));
    closeDialog();
  };

  const shapeClass = shape === "round" ? "rounded-full" : "rounded-xl";
  const inlineError = pickError ?? error;
  const hasImage = currentUrl !== null;

  return (
    <div className="space-y-2">
      <div className={cn("relative", shape === "round" ? "inline-block" : "block")}>
        <div
          className={cn(
            "relative overflow-hidden border border-outline-variant bg-surface-container-high",
            shapeClass,
            shape === "round" ? "size-28 shadow-tinted" : "aspect-[8/3] w-full",
            mediaClassName,
          )}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={label}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            fallback
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-on-surface/40">
              <Icon
                name="progress_activity"
                className="animate-spin text-inverse-on-surface"
              />
            </div>
          ) : null}
        </div>

        {/* Overlaid control — anchored to the (non-clipped) wrapper so the round
            media never crops it. Solid surface bg + shadow keeps it legible over
            any photo. Add/change only: there is deliberately no remove button, so
            an uploaded image can be replaced but never cleared. */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            aria-label={hasImage ? `เปลี่ยน${label}` : `เพิ่ม${label}`}
            className="grid size-9 place-items-center rounded-full border border-outline-variant bg-surface text-on-surface shadow-sm transition hover:bg-surface-container disabled:opacity-50"
          >
            <Icon name={hasImage ? "photo_camera" : "add_a_photo"} size={18} />
          </button>
        </div>
      </div>

      {inlineError ? (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error-container/40 px-3 py-2 text-label-md text-error"
        >
          {inlineError}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFile}
      />

      {pickedSrc ? (
        <ImageCropDialog
          open
          src={pickedSrc}
          shape={shape}
          aspect={aspect}
          title={cropTitle}
          busy={busy}
          onCancel={closeDialog}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
}
