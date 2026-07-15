/**
 * Google Maps deep-link + coordinate helpers.
 *
 * Pure, browser-safe module (no `server-only`, no DB, no network): shared by the
 * customer "นำทาง" buttons, the shop location picker, and the "ใกล้ฉัน" distance
 * badges so the URL/parse/distance rules never drift between client and server.
 *
 * Cost note: we never call the Google Maps API. The directions button is just a
 * universal `maps/dir` deep link that opens the user's own Maps app/site — zero
 * cost, no API key.
 */

export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;

export type LatLng = { lat: number; lng: number };

/** Coerce a string|number|null coordinate (Supabase returns `numeric` as string) to a finite number, or null. */
export function toCoord(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= LAT_MIN && lat <= LAT_MAX;
}

export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= LNG_MIN && lng <= LNG_MAX;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return isValidLat(lat) && isValidLng(lng);
}

export type ShopLocation = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
};

/**
 * Build a Google Maps directions ("นำทาง") deep link for a shop.
 *
 * Prefers a precise coordinate pin when the shop has one; otherwise falls back
 * to a text search on the address (or the joined จังหวัด/เขต/แขวง) so shops that
 * never dropped a pin still get a working button. Uses the `dir` endpoint with
 * no origin so Google Maps navigates from the user's current location.
 *
 * Returns null only when there is neither a pin nor any address text.
 */
export function buildShopDirectionsUrl(shop: ShopLocation): string | null {
  const lat = toCoord(shop.latitude);
  const lng = toCoord(shop.longitude);
  if (lat !== null && lng !== null && isValidLatLng(lat, lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const addressText =
    shop.address?.trim() ||
    [shop.subdistrict, shop.district, shop.province]
      .filter(Boolean)
      .join(" ")
      .trim();
  if (addressText) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      addressText,
    )}`;
  }
  return null;
}

/** Google Maps "ดูตำแหน่งบนแผนที่" verify link for a bare coordinate (drops a pin, no directions). */
export function buildLatLngPreviewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// The precise place pin lives in the `!3d<lat>!4d<lng>` chunk. A `/place/…` URL
// can carry SEVERAL such pairs (a searched point, then the resolved place); the
// pair bound to the place — after its CID — is the LAST one, so we scan these
// separately and take the last valid match.
const PLACE_PIN_PATTERN =
  /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/gu;

// Fallbacks, most to least specific, tried only when there is no `!3d!4d` pin.
// `@lat,lng` is the map's VIEWPORT centre (offset from the pin by tens of
// metres), so it must rank below the place pin above — it's a last resort for
// plain map URLs that have no pin. Query forms cover `?q=`, `&query=`,
// `destination=`, `daddr=`.
const LATLNG_PATTERNS: readonly RegExp[] = [
  /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/u,
  /[?&](?:q|query|destination|daddr)=(?:loc:)?(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/u,
  /\/(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:[/,?]|$)/u,
];

function coordOf(latStr: string, lngStr: string): LatLng | null {
  const lat = Number(latStr);
  const lng = Number(lngStr);
  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

/**
 * Extract a lat/lng pair from a full Google Maps URL (or raw "lat,lng" text).
 *
 * Prefers the precise place pin (`!3d!4d`, last occurrence) over the `@` viewport
 * centre — a `/place/…` URL carries both, and the `@` chunk sits tens of metres
 * off the actual pin, which put shops "next to" their real spot before this.
 *
 * Returns null for short links (`maps.app.goo.gl`, `goo.gl/maps`) — those carry
 * no coordinates and must be expanded server-side first (see resolveMapsLink).
 */
export function parseLatLngFromGoogleMapsUrl(input: string): LatLng | null {
  if (!input) return null;
  const text = input.trim();

  // Bare "13.7466, 100.5347" paste.
  const bare = text.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/u);
  if (bare) {
    const ll = coordOf(bare[1], bare[2]);
    if (ll) return ll;
  }

  // Place pin — the last valid `!3d!4d` pair (the one bound to the place's CID).
  const pins = [...text.matchAll(PLACE_PIN_PATTERN)];
  for (let i = pins.length - 1; i >= 0; i--) {
    const ll = coordOf(pins[i][1], pins[i][2]);
    if (ll) return ll;
  }

  for (const re of LATLNG_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const ll = coordOf(m[1], m[2]);
      if (ll) return ll;
    }
  }
  return null;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km between two coordinates (Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Human-friendly Thai distance label, e.g. "450 ม." / "2.3 กม." / "12 กม.". */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  if (km < 10) return `${km.toFixed(1)} กม.`;
  return `${Math.round(km)} กม.`;
}
