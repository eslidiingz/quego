import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client over the S3-compatible API (R2 has no first-party SDK;
 * the AWS S3 client talks to it via the account's R2 endpoint with region
 * "auto"). Mirrors {@link getSupabaseAdmin} — a single cached client, secrets
 * read from server-only env, and a throw (not a silent null) when misconfigured.
 *
 * The write credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are
 * intentionally NOT prefixed with NEXT_PUBLIC_ so they never enter the browser
 * bundle. Reads are public via NEXT_PUBLIC_R2_PUBLIC_BASE_URL (see r2/url.ts) —
 * these keys gate writes only.
 */
let cached: S3Client | null = null;

function getR2(): S3Client {
  if (cached) return cached;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2_ENDPOINT, R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY in environment.",
    );
  }
  cached = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // R2 is path-style; virtual-host style addressing is not supported.
    forcePathStyle: true,
  });
  return cached;
}

function bucket(): string {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error("Missing R2_BUCKET in environment.");
  return name;
}

/**
 * Upload an object to R2. `body` is the raw bytes; `contentType` is set so the
 * CDN serves it correctly. Images are public + immutable (a new key is minted on
 * every replace — see the service layer), so they're cached aggressively.
 */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await getR2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/** Best-effort delete of a previously-uploaded object (replace / remove). */
export async function deleteObject(key: string): Promise<void> {
  await getR2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
