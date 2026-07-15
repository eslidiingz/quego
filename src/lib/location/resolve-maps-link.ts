"use server";

/**
 * Expand a pasted Google Maps link into a lat/lng pair.
 *
 * The mobile "share" flow hands out short links (`maps.app.goo.gl/…`) that carry
 * NO coordinates in the URL — they only resolve to the real place after a
 * redirect. Desktop URLs and bare "lat,lng" pastes already contain the pin, so
 * those are handled inline on the client without a round-trip; this server
 * action is the fallback that follows the redirect to recover the coordinates.
 *
 * SSRF hardening: we only ever fetch Google-owned hosts, https only, and follow
 * at most a couple of redirects manually (never `redirect: "follow"`) so a
 * crafted link can't bounce us onto an internal host.
 */

import { parseLatLngFromGoogleMapsUrl } from "@/lib/location/maps";

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "g.co",
]);

const MAX_HOPS = 3;
const FETCH_TIMEOUT_MS = 5000;

export type ResolveMapsLinkResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; message: string };

function isAllowed(url: URL): boolean {
  return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
}

export async function resolveMapsLink(rawUrl: string): Promise<ResolveMapsLinkResult> {
  const input = (rawUrl ?? "").trim();
  if (!input) return { ok: false, message: "กรุณาวางลิงก์ Google Maps" };

  // Fast path: a full desktop URL or bare "lat,lng" already carries the pin.
  const direct = parseLatLngFromGoogleMapsUrl(input);
  if (direct) return { ok: true, lat: direct.lat, lng: direct.lng };

  let current: URL;
  try {
    current = new URL(input);
  } catch {
    return { ok: false, message: "ลิงก์ไม่ถูกต้อง" };
  }
  if (!isAllowed(current)) {
    return { ok: false, message: "รองรับเฉพาะลิงก์ Google Maps" };
  }

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return { ok: false, message: "อ่านลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }

    const location = res.headers.get("location");
    const found =
      parseLatLngFromGoogleMapsUrl(current.toString()) ??
      (location ? parseLatLngFromGoogleMapsUrl(location) : null);
    if (found) return { ok: true, lat: found.lat, lng: found.lng };

    // Not a redirect (or no Location) and no coords found — give up.
    if (!location || res.status < 300 || res.status >= 400) break;

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      break;
    }
    if (!isAllowed(next)) {
      return { ok: false, message: "รองรับเฉพาะลิงก์ Google Maps" };
    }
    current = next;
  }

  return {
    ok: false,
    message: "ไม่พบพิกัดในลิงก์นี้ ลองเปิดใน Google Maps แล้ว copy ลิงก์ใหม่",
  };
}
