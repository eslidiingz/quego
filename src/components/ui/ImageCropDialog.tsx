"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export type ImageCropShape = "round" | "rect";

export type ImageCropDialogProps = {
  open: boolean;
  /** Object URL of the source image being cropped. */
  src: string;
  shape: ImageCropShape;
  /** Crop aspect ratio (e.g. 1 for logo, 1600/600 for cover). */
  aspect: number;
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
};

/**
 * Output dimensions per shape. The cropper UI only chooses WHICH region of the
 * source to keep; this is the fixed pixel size we rasterise it to, so every
 * upload lands at a predictable resolution regardless of the source file.
 */
const OUTPUT: Record<ImageCropShape, { width: number; height: number; mime: string; quality?: number }> = {
  // Logo → 512×512 WebP (small + alpha-capable, so transparent logos stay crisp).
  round: { width: 512, height: 512, mime: "image/webp", quality: 0.92 },
  // Cover → 1600×600 WebP (light wide photo).
  rect: { width: 1600, height: 600, mime: "image/webp", quality: 0.82 },
};

/**
 * Crop the source image to `areaPixels` (SOURCE natural-pixel coords from
 * react-easy-crop) and rasterise to the fixed output dimensions. Re-encodes to
 * WebP for a small file. If a browser can't encode WebP, `canvas.toBlob` falls
 * back to PNG per spec — fine, because the caller derives the filename/type
 * from the produced blob and the SERVER re-sniffs the bytes either way. (WebP
 * canvas encoding is supported on iOS Safari 16+.)
 */
async function exportCroppedBlob(src: string, areaPixels: Area, shape: ImageCropShape): Promise<Blob> {
  const { width: outW, height: outH, mime, quality } = OUTPUT[shape];

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("ไม่สามารถโหลดรูปภาพได้"));
    el.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถประมวลผลรูปภาพได้");

  ctx.drawImage(
    img,
    areaPixels.x,
    areaPixels.y,
    areaPixels.width,
    areaPixels.height,
    0,
    0,
    outW,
    outH,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("ไม่สามารถสร้างไฟล์รูปภาพได้"))),
      mime,
      quality,
    );
  });
}

/**
 * SRP: a crop modal. It only chooses + rasterises a region of `src`; it knows
 * nothing about uploading or which shop slot it serves. The cropped Blob is
 * handed back via `onConfirm` for the parent to upload.
 */
export function ImageCropDialog({
  open,
  src,
  shape,
  aspect,
  title,
  onCancel,
  onConfirm,
  busy = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, croppedAreaPixels: Area) => {
    setAreaPixels(croppedAreaPixels);
  }, []);

  const working = busy || exporting;

  const handleConfirm = async () => {
    if (!areaPixels || working) return;
    setError(null);
    setExporting(true);
    try {
      const blob = await exportCroppedBlob(src, areaPixels, shape);
      onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ไม่สามารถบันทึกรูปภาพได้");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={working ? () => {} : onCancel}
      title={title}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            rounded="full"
            onClick={onCancel}
            disabled={working}
            iconLeft={<Icon name="close" />}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="lg"
            rounded="full"
            onClick={handleConfirm}
            disabled={working || !areaPixels}
            iconLeft={
              working ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="check" />
              )
            }
          >
            {working ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-on-surface/80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={shape}
            showGrid={shape === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <Icon name="zoom_out" className="text-on-surface-variant" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="ปรับขนาดรูปภาพ"
            disabled={working}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-container-high accent-primary disabled:opacity-50"
          />
          <Icon name="zoom_in" className="text-on-surface-variant" />
        </div>

        <p className="text-label-md text-on-surface-variant">
          เลื่อนรูปเพื่อจัดตำแหน่ง และลากแถบเพื่อย่อ-ขยาย
        </p>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-error/30 bg-error-container/40 px-3 py-2 text-label-md text-error"
          >
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
