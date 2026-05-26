"use client";

import { useEffect, useState } from "react";
import { Toast, type ToastKind } from "@/components/ui/Toast";

/**
 * Reads a "notice" search-param on mount and surfaces it as a toast, then
 * strips the param from the URL so the toast doesn't reappear on refresh.
 *
 * Kept thin (SRP): mapping of notice → message lives here so the rest of
 * the auth flow doesn't have to know what flash codes exist.
 */
export function FlashToast({ notice }: { notice?: string }) {
  const [visible, setVisible] = useState(Boolean(notice));

  const mapped = mapNotice(notice);

  useEffect(() => {
    if (!notice) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("notice")) {
      url.searchParams.delete("notice");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [notice]);

  if (!visible || !mapped) return null;

  return (
    <Toast
      kind={mapped.kind}
      message={mapped.message}
      onDismiss={() => setVisible(false)}
    />
  );
}

function mapNotice(
  notice: string | undefined,
): { kind: ToastKind; message: string } | null {
  switch (notice) {
    case "signed-out":
      return { kind: "success", message: "ออกจากระบบเรียบร้อยแล้ว" };
    case "session-expired":
      return { kind: "info", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
    case "impersonation-ended":
      return { kind: "success", message: "ออกจากโหมดสวมรอยเรียบร้อยแล้ว" };
    case "impersonation-unavailable":
      return {
        kind: "error",
        message: "ร้านนี้ไม่สามารถเข้าใช้งานได้ในขณะนี้",
      };
    default:
      return null;
  }
}
