import { describe, it, expect } from "vitest";
import {
  buildShopDirectionsUrl,
  parseLatLngFromGoogleMapsUrl,
  distanceKm,
  formatDistanceKm,
  isValidLatLng,
  toCoord,
} from "./maps";

describe("buildShopDirectionsUrl", () => {
  it("uses a coordinate pin when lat/lng are present", () => {
    const url = buildShopDirectionsUrl({ latitude: 13.7466, longitude: 100.5347 });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=13.7466,100.5347",
    );
  });

  it("accepts string coordinates (Supabase numeric comes back as string)", () => {
    const url = buildShopDirectionsUrl({ latitude: "13.7466", longitude: "100.5347" });
    expect(url).toContain("destination=13.7466,100.5347");
  });

  it("falls back to the address text when there is no pin", () => {
    const url = buildShopDirectionsUrl({ address: "123 ถนนสุขุมวิท กรุงเทพฯ" });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent("123 ถนนสุขุมวิท กรุงเทพฯ"),
    );
  });

  it("falls back to joined area names when address is blank", () => {
    const url = buildShopDirectionsUrl({
      subdistrict: "คลองตัน",
      district: "คลองเตย",
      province: "กรุงเทพมหานคร",
    });
    expect(url).toContain(encodeURIComponent("คลองตัน คลองเตย กรุงเทพมหานคร"));
  });

  it("ignores an incomplete/invalid pin and falls back", () => {
    const url = buildShopDirectionsUrl({
      latitude: 999,
      longitude: 100,
      address: "fallback",
    });
    expect(url).toContain("destination=fallback");
  });

  it("returns null when there is neither a pin nor address text", () => {
    expect(buildShopDirectionsUrl({})).toBeNull();
  });
});

describe("parseLatLngFromGoogleMapsUrl", () => {
  it("parses a desktop @lat,lng URL", () => {
    const r = parseLatLngFromGoogleMapsUrl(
      "https://www.google.com/maps/place/Shop/@13.7466,100.5347,17z/data=!3m1",
    );
    expect(r).toEqual({ lat: 13.7466, lng: 100.5347 });
  });

  it("parses the place-data !3d!4d form", () => {
    const r = parseLatLngFromGoogleMapsUrl(
      "https://www.google.com/maps/place/x/data=!3d13.75!4d100.5",
    );
    expect(r).toEqual({ lat: 13.75, lng: 100.5 });
  });

  it("prefers the place pin (!3d!4d) over the @ viewport centre", () => {
    // A /place/ URL carries the camera centre in @lat,lng AND the true pin in
    // !3d!4d — the pin must win, else the shop lands tens of metres off.
    const r = parseLatLngFromGoogleMapsUrl(
      "https://www.google.com/maps/place/Shop/@13.8211529,100.4575168,17z/data=!3m5!1s0xabc:0xdef!8m2!3d13.8213418!4d100.4583775",
    );
    expect(r).toEqual({ lat: 13.8213418, lng: 100.4583775 });
  });

  it("takes the LAST !3d!4d pair — the one bound to the place, not the search point", () => {
    // Real สนามฟุตบอลมหาวิทยาลัยราชพฤกษ์ link: a DMS search point (!3d13.81997…)
    // precedes the resolved place (!3d13.8213418…). The last pair is the pin.
    const r = parseLatLngFromGoogleMapsUrl(
      "https://www.google.com/maps/place/x/@13.8211529,100.4575168,17.37z/data=!4m12!1m5!3m4!2zMTPCsDQ5JzExLjkiTiAxMDDCsDI3JzE3LjYiRQ!8m2!3d13.81997!4d100.4548807!3m5!1s0x30e29a66f1dc6ba5:0x68e3a5de97d98c05!8m2!3d13.8213418!4d100.4583775!16s%2Fg%2F11fxy29nck?entry=ttu",
    );
    expect(r).toEqual({ lat: 13.8213418, lng: 100.4583775 });
  });

  it("parses ?q=lat,lng and &query=lat,lng and destination=", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.google.com/?q=13.1,100.2")).toEqual({
      lat: 13.1,
      lng: 100.2,
    });
    expect(
      parseLatLngFromGoogleMapsUrl(
        "https://www.google.com/maps/search/?api=1&query=13.3,100.4",
      ),
    ).toEqual({ lat: 13.3, lng: 100.4 });
    expect(
      parseLatLngFromGoogleMapsUrl(
        "https://www.google.com/maps/dir/?api=1&destination=13.5,100.6",
      ),
    ).toEqual({ lat: 13.5, lng: 100.6 });
  });

  it("parses a bare 'lat, lng' paste", () => {
    expect(parseLatLngFromGoogleMapsUrl("13.7466, 100.5347")).toEqual({
      lat: 13.7466,
      lng: 100.5347,
    });
  });

  it("returns null for a short link with no coordinates", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.app.goo.gl/abcd1234")).toBeNull();
  });

  it("returns null for out-of-range coordinates", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.google.com/?q=200,999")).toBeNull();
  });

  it("returns null for empty/garbage input", () => {
    expect(parseLatLngFromGoogleMapsUrl("")).toBeNull();
    expect(parseLatLngFromGoogleMapsUrl("just some text")).toBeNull();
  });
});

describe("distanceKm", () => {
  it("is zero for identical points", () => {
    expect(distanceKm({ lat: 13.7, lng: 100.5 }, { lat: 13.7, lng: 100.5 })).toBeCloseTo(0, 5);
  });

  it("approximates a known short distance", () => {
    // ~1.11 km per 0.01° of latitude.
    const d = distanceKm({ lat: 13.7, lng: 100.5 }, { lat: 13.71, lng: 100.5 });
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });
});

describe("formatDistanceKm", () => {
  it("shows metres under 1 km", () => {
    expect(formatDistanceKm(0.45)).toBe("450 ม.");
  });
  it("shows one decimal under 10 km", () => {
    expect(formatDistanceKm(2.34)).toBe("2.3 กม.");
  });
  it("rounds to whole km at/above 10 km", () => {
    expect(formatDistanceKm(12.6)).toBe("13 กม.");
  });
  it("returns empty for invalid input", () => {
    expect(formatDistanceKm(-1)).toBe("");
    expect(formatDistanceKm(Number.NaN)).toBe("");
  });
});

describe("coordinate guards", () => {
  it("toCoord coerces strings and rejects junk", () => {
    expect(toCoord("13.5")).toBe(13.5);
    expect(toCoord(13.5)).toBe(13.5);
    expect(toCoord("")).toBeNull();
    expect(toCoord(null)).toBeNull();
    expect(toCoord("abc")).toBeNull();
  });

  it("isValidLatLng enforces bounds", () => {
    expect(isValidLatLng(13.7, 100.5)).toBe(true);
    expect(isValidLatLng(-90, -180)).toBe(true);
    expect(isValidLatLng(91, 100)).toBe(false);
    expect(isValidLatLng(13, 181)).toBe(false);
  });
});
