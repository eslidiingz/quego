import { describe, it, expect } from "vitest";
import {
  sniffImageMime,
  validateImageFile,
  MAX_LOGO_BYTES,
  IMAGE_MIME,
  PICKABLE_IMAGE_MIME,
} from "./media";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
const WEBP_MAGIC = [
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // (size, ignored)
  0x57, 0x45, 0x42, 0x50, // WEBP
];

function fileOf(magic: number[], { size, type }: { size: number; type: string }): File {
  // Pad to the requested size so File.size reflects a realistic payload while
  // the leading bytes carry the signature we want to sniff.
  const bytes = new Uint8Array(Math.max(size, magic.length));
  bytes.set(magic, 0);
  return new File([bytes], "upload", { type });
}

describe("sniffImageMime", () => {
  it("identifies PNG, JPEG and WEBP by magic bytes", () => {
    expect(sniffImageMime(new Uint8Array(PNG_MAGIC))).toBe("image/png");
    expect(sniffImageMime(new Uint8Array(JPEG_MAGIC))).toBe("image/jpeg");
    expect(sniffImageMime(new Uint8Array(WEBP_MAGIC))).toBe("image/webp");
  });

  it("returns null for unknown / non-image bytes", () => {
    expect(sniffImageMime(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
    // "RIFF" header but NOT a WEBP (e.g. a WAV) must be rejected.
    const wav = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
    expect(sniffImageMime(new Uint8Array(wav))).toBeNull();
  });

  it("returns null for a truncated signature", () => {
    expect(sniffImageMime(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("accepts a valid PNG within the size cap", async () => {
    const res = await validateImageFile(
      fileOf(PNG_MAGIC, { size: 1024, type: "image/png" }),
      { maxBytes: MAX_LOGO_BYTES },
    );
    expect(res).toEqual({ ok: true, mime: "image/png", ext: "png" });
  });

  it("maps JPEG to the .jpg extension", async () => {
    const res = await validateImageFile(
      fileOf(JPEG_MAGIC, { size: 1024, type: "image/jpeg" }),
      { maxBytes: MAX_LOGO_BYTES },
    );
    expect(res).toEqual({ ok: true, mime: "image/jpeg", ext: "jpg" });
  });

  it("rejects an empty file", async () => {
    const res = await validateImageFile(new File([], "x", { type: "image/png" }), {
      maxBytes: MAX_LOGO_BYTES,
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a file over the size cap", async () => {
    const res = await validateImageFile(
      fileOf(PNG_MAGIC, { size: MAX_LOGO_BYTES + 1, type: "image/png" }),
      { maxBytes: MAX_LOGO_BYTES },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("ใหญ่เกินไป");
  });

  it("rejects a spoofed type (claims image/png, bytes are not)", async () => {
    const res = await validateImageFile(
      fileOf([0x4d, 0x5a, 0x90, 0x00], { size: 1024, type: "image/png" }),
      { maxBytes: MAX_LOGO_BYTES },
    );
    expect(res.ok).toBe(false);
  });
});

describe("input (pickable) vs stored (server) formats", () => {
  it("accepts WebP server-side — the crop output format — as .webp", async () => {
    const res = await validateImageFile(
      fileOf(WEBP_MAGIC, { size: 1024, type: "image/webp" }),
      { maxBytes: MAX_LOGO_BYTES },
    );
    expect(res).toEqual({ ok: true, mime: "image/webp", ext: "webp" });
  });

  it("lets users PICK avif but never STORES it (sniff returns null)", () => {
    // ISO-BMFF ftyp box with the 'avif' major brand.
    const avif = [
      0x00, 0x00, 0x00, 0x18, // box size
      0x66, 0x74, 0x79, 0x70, // "ftyp"
      0x61, 0x76, 0x69, 0x66, // "avif"
      0x00, 0x00, 0x00, 0x00,
    ];
    // PICKABLE includes avif (the file dialog), but the server allowlist excludes it…
    expect(PICKABLE_IMAGE_MIME).toContain("image/avif");
    expect(IMAGE_MIME as readonly string[]).not.toContain("image/avif");
    // …and the magic-byte sniff (which gates what's actually stored) ignores it,
    // so a raw avif POSTed directly to the server is rejected.
    expect(sniffImageMime(new Uint8Array(avif))).toBeNull();
  });
});
