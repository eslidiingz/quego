import Link from "next/link";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopReport } from "@/lib/services/insights";
import { parseRange } from "@/lib/insights/aggregate";
import { formatBaht } from "@/lib/baht";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";
import { RangeSelector } from "@/components/shop/insights/RangeSelector";
import { ReportFilterBar } from "@/components/shop/insights/ReportFilterBar";
import { MetricTile } from "@/components/shop/insights/MetricTile";
import { RevenueHeroCard } from "@/components/shop/insights/RevenueHeroCard";
import { DeltaChip } from "@/components/shop/insights/DeltaChip";
import { RevenueByStaffList } from "@/components/shop/insights/RevenueByStaffList";
import { RevenueByServiceList } from "@/components/shop/insights/RevenueByServiceList";
import { BusyByHourChart } from "@/components/shop/insights/BusyByHourChart";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "รายงานร้าน · Quego",
};

type SearchParams = Promise<{ range?: string; staff?: string; service?: string }>;

export default async function ShopReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { range: rawRange, staff: rawStaff, service: rawService } = await searchParams;
  const range = parseRange(rawRange);
  // Multi-select filters ride the URL as comma-separated id lists.
  const parseIds = (raw: string | undefined) =>
    (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const filterStaffIds = parseIds(rawStaff);
  const filterServiceIds = parseIds(rawService);

  const { insights, deltas, staffOptions, serviceOptions } = await getShopReport(
    session.shopId,
    range,
    { filterStaffIds, filterServiceIds },
  );

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const hasPricedServices = insights.revenueByService.some((s) => s.revenue > 0);
  const hasStaff = staffOptions.length > 0;

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ผลการดำเนินงาน"
        title="รายงานร้าน"
        description="สรุปรายได้ พนักงาน บริการ และช่วงเวลาคนเยอะ เพื่อช่วยวางแผนร้าน"
      />

      {/* Sticky filter bar: sticks BELOW the 64px ShopShell header (which is
          itself sticky top-0 z-30), with a solid bg so report content can't
          bleed through on scroll. */}
      <div className="sticky top-16 z-20 -mx-4 space-y-3 border-b border-outline-variant bg-surface px-4 py-3 shadow-sm md:-mx-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <RangeSelector current={range} staff={filterStaffIds} service={filterServiceIds} />
          <ReportFilterBar
            range={range}
            staffOptions={staffOptions}
            serviceOptions={serviceOptions}
            activeStaffIds={filterStaffIds}
            activeServiceIds={filterServiceIds}
          />
        </div>
        <p className="text-label-md text-on-surface-variant">
          ช่วง {formatThaiDate(insights.windowStart)} – {formatThaiDate(insights.windowEnd)}
        </p>
      </div>

      {insights.filteredToZero ? (
        <FilteredToZeroState range={range} />
      ) : !insights.hasData ? (
        <EmptyState canExpand={range !== "90"} />
      ) : (
        <>
          <RevenueHeroCard
            revenue={insights.revenue}
            servedCount={insights.totalBookings}
            delta={deltas.revenue}
          />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile
              label="การจองทั้งหมด"
              value={`${insights.totalBookings}`}
              sub="ไม่รวมที่ยกเลิก"
              tone="primary"
              delta={<DeltaChip delta={deltas.totalBookings} />}
            />
            <MetricTile
              label="อัตรายกเลิก"
              value={pct(insights.cancellationRate)}
              sub="จากการจองทั้งหมด"
              tone="error"
            />
            <MetricTile
              label="รายได้เฉลี่ยต่อคิว"
              value={formatBaht(insights.avgTicket)}
              sub="รายได้ ÷ คิวที่ให้บริการ"
              tone="secondary"
              delta={<DeltaChip delta={deltas.avgTicket} />}
            />
          </section>

          <ReportSection
            title="รายได้ตามพนักงาน"
            sub="เรียงตามรายได้สูงสุด"
          >
            <RevenueByStaffList rows={insights.revenueByStaff} />
            {!hasStaff ? (
              <p className="mt-4 text-label-md text-on-surface-variant">
                เพิ่มพนักงานในร้าน เพื่อดูรายได้รายคน{" "}
                <Link href="/shop/staff" className="font-semibold text-primary hover:text-primary-container">
                  จัดการพนักงาน
                </Link>
              </p>
            ) : null}
            {insights.hasFilter ? <FilterScopeNote /> : null}
          </ReportSection>

          <ReportSection
            title="รายได้ตามบริการ"
            sub="บริการที่ทำรายได้ให้ร้านมากที่สุด"
          >
            {hasPricedServices ? (
              <RevenueByServiceList rows={insights.revenueByService} />
            ) : (
              <p className="text-body-md text-on-surface-variant">
                ยังไม่มีราคาบริการ จึงประมาณรายได้รายบริการไม่ได้{" "}
                <Link href="/shop/services" className="font-semibold text-primary hover:text-primary-container">
                  ตั้งราคาบริการ
                </Link>
              </p>
            )}
          </ReportSection>

          <ReportSection
            title="ช่วงเวลาคนเยอะ"
            sub={
              insights.peakHour != null
                ? `คนจองมากที่สุดช่วง ${pad(insights.peakHour)}:00 น.`
                : "จำนวนคิวตามชั่วโมงที่เปิดทำการ"
            }
          >
            <BusyByHourChart buckets={insights.busyByHour} />
          </ReportSection>
        </>
      )}
    </div>
  );
}

function ReportSection({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6">
      <header className="space-y-1">
        <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
        <p className="text-label-md text-on-surface-variant">{sub}</p>
      </header>
      {children}
    </section>
  );
}

/** Subtle note that fill-rate/utilization reflect the active filter selection. */
function FilterScopeNote() {
  return (
    <p className="mt-4 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
      <Icon name="info" size={16} />
      ตัวเลขด้านบนคำนวณตามตัวกรองปัจจุบัน
    </p>
  );
}

function EmptyState({ canExpand }: { canExpand: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest py-16 text-center">
      <Icon name="monitoring" size={36} className="text-on-surface-variant" />
      <div className="space-y-1">
        <p className="text-body-md text-on-surface">ยังไม่มีข้อมูลในช่วงนี้</p>
        <p className="text-label-md text-on-surface-variant">
          เมื่อมีการจองเข้ามา รายงานของร้านจะแสดงที่นี่
        </p>
      </div>
      {canExpand ? (
        <Link
          href="/shop/insights?range=90"
          scroll={false}
          className={buttonClassName({ variant: "ghost", size: "md" })}
        >
          <Icon name="date_range" size={18} />
          ลองขยายช่วงเป็น 90 วัน
        </Link>
      ) : null}
    </div>
  );
}

function FilteredToZeroState({ range }: { range: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest py-16 text-center">
      <Icon name="filter_alt_off" size={36} className="text-on-surface-variant" />
      <div className="space-y-1">
        <p className="text-body-md text-on-surface">ไม่พบข้อมูลตามตัวกรองที่เลือก</p>
        <p className="text-label-md text-on-surface-variant">
          ลองลบบางตัวกรอง แล้วดูอีกครั้ง
        </p>
      </div>
      <Link
        href={`/shop/insights?range=${range}`}
        scroll={false}
        className={buttonClassName({ variant: "outline", size: "md" })}
      >
        <Icon name="filter_alt_off" size={18} />
        ล้างตัวกรองทั้งหมด
      </Link>
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
