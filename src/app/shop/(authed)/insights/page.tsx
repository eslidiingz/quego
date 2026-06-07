import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopInsights } from "@/lib/services/insights";
import { parseRange } from "@/lib/insights/aggregate";
import { formatBaht } from "@/lib/baht";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { RangeSelector } from "@/components/shop/insights/RangeSelector";
import { MetricTile } from "@/components/shop/insights/MetricTile";
import { BusyByHourChart } from "@/components/shop/insights/BusyByHourChart";
import { StaffUtilizationList } from "@/components/shop/insights/StaffUtilizationList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ข้อมูลเชิงลึก · queva",
};

type SearchParams = Promise<{ range?: string }>;

export default async function ShopInsightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  const insights = await getShopInsights(session.shopId, range);

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const fillSub =
    insights.lineMinutes > 0
      ? `เทียบเวลาทำการ × ${insights.capacity} สาย`
      : "ตั้งเวลาทำการเพื่อคำนวณ";

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ผลการดำเนินงาน"
        title="ข้อมูลเชิงลึก"
        description="สรุปคิว ช่วงเวลาคนเยอะ อัตราเต็มคิว และการใช้งานพนักงาน เพื่อช่วยวางแผนร้าน"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label-md text-on-surface-variant">
          ช่วง {formatThaiDate(insights.windowStart)} – {formatThaiDate(insights.windowEnd)}
        </p>
        <RangeSelector current={range} />
      </div>

      {!insights.hasData ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              label="การจองทั้งหมด"
              value={`${insights.totalBookings}`}
              sub="ไม่รวมที่ยกเลิก"
              tone="primary"
            />
            <MetricTile
              label="อัตราเต็มคิว"
              value={pct(insights.fillRate)}
              sub={fillSub}
              tone="success"
            />
            <MetricTile
              label="อัตรายกเลิก"
              value={pct(insights.cancellationRate)}
              sub="จากการจองทั้งหมด"
              tone="error"
            />
            <MetricTile
              label="รายได้โดยประมาณ"
              value={formatBaht(insights.revenue)}
              sub="จากคิวที่ให้บริการแล้ว"
              tone="secondary"
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6">
            <header className="space-y-1">
              <h2 className="font-display text-headline-md text-on-surface">
                ช่วงเวลาคนเยอะ
              </h2>
              <p className="text-label-md text-on-surface-variant">
                {insights.peakHour != null
                  ? `คนจองมากที่สุดช่วง ${pad(insights.peakHour)}:00 น.`
                  : "จำนวนคิวตามชั่วโมงที่เปิดทำการ"}
              </p>
            </header>
            <BusyByHourChart buckets={insights.busyByHour} />
          </section>

          <section className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6">
            <header className="space-y-1">
              <h2 className="font-display text-headline-md text-on-surface">
                การใช้งานพนักงาน
              </h2>
              <p className="text-label-md text-on-surface-variant">
                สัดส่วนเวลาที่มีคิว เทียบกับเวลาทำการของร้าน
              </p>
            </header>
            {insights.lineMinutes > 0 ? (
              <StaffUtilizationList staff={insights.staff} />
            ) : (
              <p className="text-body-md text-on-surface-variant">
                ตั้งเวลาทำการของร้านก่อน เพื่อดูอัตราการใช้งานพนักงาน
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest py-16 text-center">
      <Icon name="monitoring" size={36} className="text-on-surface-variant" />
      <p className="text-body-md text-on-surface">ยังไม่มีข้อมูลในช่วงนี้</p>
      <p className="text-label-md text-on-surface-variant">
        เมื่อมีการจองเข้ามา สถิติของร้านจะแสดงที่นี่
      </p>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "2026-05-08" → "8 พ.ค." — parsed at UTC to keep the calendar date intact. */
function formatThaiDate(ymd: string): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
