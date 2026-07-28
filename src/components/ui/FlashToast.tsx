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
    case "line-connected":
      return {
        kind: "success",
        message: "เชื่อมต่อ LINE สำเร็จ ร้านของคุณจะได้รับแจ้งเตือนการจองผ่าน LINE",
      };
    case "line-connected-customer":
      return {
        kind: "success",
        message: "เชื่อมต่อ LINE สำเร็จ คุณจะได้รับข้อความยืนยันการจองผ่าน LINE",
      };
    case "line-already-linked-customer":
      return {
        kind: "error",
        message: "บัญชี LINE นี้ถูกเชื่อมกับผู้ใช้อื่นแล้ว",
      };
    case "line-denied":
      return { kind: "info", message: "ยกเลิกการเชื่อมต่อ LINE แล้ว" };
    case "line-already-linked":
      return {
        kind: "error",
        message: "บัญชี LINE นี้ถูกเชื่อมกับร้านอื่นแล้ว",
      };
    case "line-unconfigured":
      return {
        kind: "error",
        message: "ระบบยังไม่พร้อมเชื่อมต่อ LINE กรุณาลองใหม่ภายหลัง",
      };
    case "line-error":
      return {
        kind: "error",
        message: "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      };
    case "reschedule-success":
      return { kind: "success", message: "เลื่อนเวลาการจองเรียบร้อยแล้ว" };
    case "reschedule-toolate":
      return {
        kind: "error",
        message: "เลยกำหนดเวลาที่เลื่อน/ยกเลิกได้แล้ว กรุณาติดต่อร้านโดยตรง",
      };
    default:
      return null;
  }
}
