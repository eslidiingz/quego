import { getLineChannelSecret } from "@/lib/line/config";
import { verifyLineSignature } from "@/lib/line/signature";
import { dispatchLineEvents } from "@/lib/line/events";
import type { LineWebhookBody } from "@/lib/line/types";

/**
 * LINE Messaging API webhook — the app's first Route Handler.
 *
 * Runs on the Node.js runtime (node:crypto powers the signature check) and is
 * never cached. Contract: verify the x-line-signature over the RAW body, then
 * ALWAYS return 200. A non-200 makes LINE retry, which is wrong for a forged or
 * malformed request or a transient handler error — so we log and 200 instead.
 * Genuine traffic always carries a valid signature; the LINE console "Verify"
 * button sends an empty, signed payload that passes the check and no-ops.
 *
 * This path is NOT guarded by src/proxy.ts (its matcher covers only
 * /admin, /shop, /me, /login), so it stays public by design — exactly what an
 * external webhook needs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // Read the raw body ONCE, before any JSON.parse — the signature is computed
  // over these exact bytes (Next 16: request.text(); no bodyParser needed).
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  let secret: string;
  try {
    secret = getLineChannelSecret();
  } catch (err) {
    console.error("LINE webhook misconfigured (missing channel secret):", err);
    return new Response("ok", { status: 200 });
  }

  if (!verifyLineSignature(rawBody, signature, secret)) {
    console.warn("LINE webhook signature verification failed");
    return new Response("ok", { status: 200 });
  }

  try {
    const body = JSON.parse(rawBody) as LineWebhookBody;
    await dispatchLineEvents(body.events ?? []);
  } catch (err) {
    console.error("LINE webhook dispatch error:", err);
  }

  return new Response("ok", { status: 200 });
}
