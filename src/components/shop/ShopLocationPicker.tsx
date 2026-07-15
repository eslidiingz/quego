"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import {
  parseLatLngFromGoogleMapsUrl,
  buildLatLngPreviewUrl,
  isValidLatLng,
  toCoord,
  type LatLng,
} from "@/lib/location/maps";

type ResolveResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; message: string };

export type ShopLocationPickerProps = {
  defaultLatitude?: number | string | null;
  defaultLongitude?: number | string | null;
  /** Server-echoed validation error for the pin (rare — a tampered/half POST). */
  error?: string;
  disabled?: boolean;
  /**
   * DI: server action that expands a short Google Maps link to coordinates.
   * Injected as a prop so this component stays free of a server-only import and
   * both host forms wire their own action instance.
   */
  resolveLink: (url: string) => Promise<ResolveResult>;
};

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

function toInitial(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): LatLng | null {
  const la = toCoord(lat);
  const ln = toCoord(lng);
  if (la !== null && ln !== null && isValidLatLng(la, ln)) return { lat: la, lng: ln };
  return null;
}

/**
 * Owner-facing map-pin picker. Two zero-cost ways to set the pin — "use current
 * location" (browser geolocation) and "paste a Google Maps link" — both resolve
 * to the same hidden lat/lng inputs the shop form submits. No embedded map, no
 * Maps API, no key. The pin is optional; the customer directions button falls
 * back to the shop's text address when it is left unset.
 */
export function ShopLocationPicker({
  defaultLatitude,
  defaultLongitude,
  error,
  disabled,
  resolveLink,
}: ShopLocationPickerProps) {
  const [coords, setCoords] = useState<LatLng | null>(() =>
    toInitial(defaultLatitude, defaultLongitude),
  );
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const loading = status.kind === "loading";
  const busy = Boolean(disabled) || loading;

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus({ kind: "error", message: "อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง กรุณาใช้วิธีวางลิงก์แทน" });
      return;
    }
    setStatus({ kind: "loading", message: "กำลังหาตำแหน่งปัจจุบัน..." });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = round6(pos.coords.latitude);
        const lng = round6(pos.coords.longitude);
        if (!isValidLatLng(lat, lng)) {
          setStatus({ kind: "error", message: "ตำแหน่งที่ได้ไม่ถูกต้อง ลองใหม่อีกครั้ง" });
          return;
        }
        setCoords({ lat, lng });
        setStatus({ kind: "success", message: "ปักหมุดจากตำแหน่งปัจจุบันแล้ว" });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์หรือใช้วิธีวางลิงก์แทน"
            : "หาตำแหน่งไม่สำเร็จ ลองใหม่หรือใช้วิธีวางลิงก์แทน";
        setStatus({ kind: "error", message });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function applyLink() {
    const url = link.trim();
    if (!url) {
      setStatus({ kind: "error", message: "กรุณาวางลิงก์ Google Maps ก่อน" });
      return;
    }
    // Full desktop URLs / bare "lat,lng" carry the pin — resolve locally, no fetch.
    const local = parseLatLngFromGoogleMapsUrl(url);
    if (local) {
      setCoords(local);
      setLink("");
      setStatus({ kind: "success", message: "ปักหมุดจากลิงก์แล้ว" });
      return;
    }
    // Short links (maps.app.goo.gl) need a server-side redirect follow.
    setStatus({ kind: "loading", message: "กำลังอ่านลิงก์..." });
    const res = await resolveLink(url);
    if (res.ok) {
      setCoords({ lat: res.lat, lng: res.lng });
      setLink("");
      setStatus({ kind: "success", message: "ปักหมุดจากลิงก์แล้ว" });
    } else {
      setStatus({ kind: "error", message: res.message });
    }
  }

  function clearPin() {
    setCoords(null);
    setStatus({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The only values the form submits — a pair, or both blank. */}
      <input type="hidden" name="latitude" value={coords ? String(coords.lat) : ""} />
      <input type="hidden" name="longitude" value={coords ? String(coords.lng) : ""} />

      <div className="flex flex-col gap-0.5">
        <span className="text-label-md text-on-surface-variant">
          ตำแหน่งร้านบนแผนที่ (สำหรับปุ่มนำทาง)
        </span>
        <span className="text-label-sm text-on-surface-variant/70">
          ไม่บังคับ · ถ้าไม่ปักหมุด ปุ่ม “นำทาง” จะค้นหาจากที่อยู่ด้านบนแทน
        </span>
      </div>

      {coords ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-surface-container-high px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-label-md text-on-surface">
            <Icon name="location_on" size={18} className="text-primary" />
            ปักหมุดแล้ว: {coords.lat}, {coords.lng}
          </span>
          <a
            href={buildLatLngPreviewUrl(coords.lat, coords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            <Icon name="map" size={16} />
            ดูตำแหน่งบนแผนที่
          </a>
          <button
            type="button"
            onClick={clearPin}
            disabled={busy}
            className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-error disabled:opacity-50"
          >
            <Icon name="close" size={16} />
            ล้างหมุด
          </button>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="lg"
        rounded="lg"
        iconLeft={<Icon name="my_location" size={18} />}
        onClick={useCurrentLocation}
        disabled={busy}
        className="w-full sm:w-auto"
      >
        {coords ? "ปักหมุดใหม่จากตำแหน่งปัจจุบัน" : "ใช้ตำแหน่งปัจจุบัน"}
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          containerClassName="flex-1"
          aria-label="ลิงก์ Google Maps"
          placeholder="หรือวางลิงก์ Google Maps ที่นี่"
          iconLeft={<Icon name="link" />}
          inputMode="url"
          autoCapitalize="none"
          autoComplete="off"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            // Enter inside the form would submit it — apply the link instead.
            if (e.key === "Enter") {
              e.preventDefault();
              void applyLink();
            }
          }}
          disabled={busy}
        />
        <Button
          type="button"
          variant="secondary"
          size="lg"
          rounded="lg"
          onClick={() => void applyLink()}
          disabled={busy}
          className="sm:w-auto"
        >
          ใช้ลิงก์
        </Button>
      </div>

      {status.kind !== "idle" && "message" in status ? (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={
            status.kind === "error"
              ? "text-label-sm text-error"
              : status.kind === "success"
                ? "text-label-sm text-primary"
                : "text-label-sm text-on-surface-variant"
          }
        >
          {status.message}
        </p>
      ) : null}

      {error ? <p className="text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
