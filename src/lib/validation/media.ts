/**
 * Image-upload validation — the single source of truth for "what counts as an
 * acceptable shop logo/cover file", shared by the client pre-check (UX) and the
 * server-side service backstop (trust boundary). Pure module (no `server-only`,
 * no I/O beyond reading the File's own bytes) so the same rule can't drift
 * between the picker and the uploader — the same client+server split that keeps
 * phone.ts / slot-math.ts honest.
 *
 * Security: `File.type` is client-asserted (a renamed .exe can claim
 * image/png), so the real type is sniffed from the leading magic bytes, never
 * trusted from the MIME string.
 */

/**
 * Types the SERVER will accept + STORE. The crop dialog always re-encodes the
 * upload to one of these (WebP normally; PNG only if a browser can't encode
 * WebP and `canvas.toBlob` falls back). AVIF is deliberately NOT here — it's a
 * valid thing to PICK, but it's re-encoded to WebP before upload, so it never
 * reaches the server as AVIF. Keeping it out also means a direct API caller
 * can't store a raw AVIF.
 */
export const IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export type ImageMime = (typeof IMAGE_MIME)[number];

/**
 * Types the user may PICK in the file dialog. Superset of {@link IMAGE_MIME}:
 * the browser only needs to DECODE these into a canvas for cropping. AVIF is
 * decode-only here (cropped → re-encoded to WebP before upload).
 */
export const PICKABLE_IMAGE_MIME = [...IMAGE_MIME, "image/avif"] as const;

/** Per-slot size caps. Covers are wider, so they get a larger ceiling. */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_COVER_BYTES = 4 * 1024 * 1024; // 4 MB

/** Accept attribute for the <input type="file"> picker (input formats). */
export const IMAGE_ACCEPT = PICKABLE_IMAGE_MIME.join(",");

const EXT_BY_MIME: Record<ImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type ImageValidation =
  | { ok: true; mime: ImageMime; ext: string }
  | { ok: false; message: string };

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false;
  }
  return true;
}

/**
 * Identify an image type from its leading bytes, or null if it's none of the
 * three we accept. PNG/JPEG by signature; WEBP by its RIFF…WEBP container.
 */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // WEBP: "RIFF" …4-byte size… "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

function megabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

/**
 * Validate an uploaded image File against a size cap and the magic-byte
 * allowlist. Returns the sniffed mime + canonical extension on success, or a
 * Thai inline error on failure. Async because it reads the File's first bytes.
 */
export async function validateImageFile(
  file: File,
  opts: { maxBytes: number },
): Promise<ImageValidation> {
  if (!file || file.size === 0) {
    return { ok: false, message: "ไม่พบไฟล์รูปภาพ" };
  }
  if (file.size > opts.maxBytes) {
    return {
      ok: false,
      message: `ไฟล์ใหญ่เกินไป (สูงสุด ${megabytes(opts.maxBytes)} MB)`,
    };
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = sniffImageMime(head);
  if (!mime) {
    return {
      ok: false,
      message: "รองรับเฉพาะไฟล์รูปภาพ PNG, JPG หรือ WEBP",
    };
  }
  return { ok: true, mime, ext: EXT_BY_MIME[mime] };
}
