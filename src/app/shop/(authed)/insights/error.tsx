"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Error boundary for the insights dashboard. getShopInsights throws (rather than
 * rendering all-zero data) when a DB query fails, so a real failure surfaces
 * here as a retryable state instead of a misleading "no data" screen.
 */
export default function InsightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Shop insights failed to load:", error);
  }, [error]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest py-16 text-center">
        <Icon name="error" size={36} className="text-error" />
        <p className="text-body-md text-on-surface">ไม่สามารถโหลดข้อมูลเชิงลึกได้</p>
        <p className="text-label-md text-on-surface-variant">
          เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง
        </p>
        <Button variant="outline" onClick={reset} iconLeft={<Icon name="refresh" size={18} />}>
          ลองใหม่
        </Button>
      </div>
    </div>
  );
}
