"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";

/**
 * Month/year period picker for the shop report (กรองรายเดือน / รายปี), mirroring
 * the expense page's filter so the two surfaces feel the same. A year picker plus
 * a month picker whose "ทั้งปี" option switches from a monthly to a whole-year
 * view. Selecting a period writes the `?range=` token (`YYYY-MM` for a month,
 * `YYYY` for a year) and navigates — the server re-resolves the window — while
 * PRESERVING any active staff/service filters.
 *
 * Years are shown in the Buddhist era (พ.ศ.) to match the rest of the UI; the
 * value stays the Gregorian year used in the URL token.
 */
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function ReportPeriodPicker({
  years,
  year,
  month,
  staff = [],
  service = [],
}: {
  /** Selectable Gregorian years, newest first. */
  years: number[];
  /** The currently-shown year (Gregorian). */
  year: number;
  /** "all" = whole year (รายปี); "01".."12" = a single month (รายเดือน). */
  month: string;
  staff?: string[];
  service?: string[];
}) {
  const router = useRouter();

  // Build the destination URL for a (year, month) selection, preserving filters.
  const navigate = (nextYear: number, nextMonth: string) => {
    const range =
      nextMonth === "all" ? String(nextYear) : `${nextYear}-${nextMonth}`;
    const params = new URLSearchParams({ range });
    if (staff.length) params.set("staff", staff.join(","));
    if (service.length) params.set("service", service.join(","));
    router.push(`/shop/insights?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      data-tour={TOUR_ANCHORS.insightsPeriod}
      className="grid grid-cols-2 gap-3 sm:max-w-md"
    >
      <Select
        label="ปี"
        value={String(year)}
        onChange={(e) => navigate(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y + 543}
          </option>
        ))}
      </Select>
      <Select
        label="เดือน"
        value={month}
        onChange={(e) => navigate(year, e.target.value)}
      >
        <option value="all">ทั้งปี</option>
        {THAI_MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>
            {name}
          </option>
        ))}
      </Select>
    </div>
  );
}
