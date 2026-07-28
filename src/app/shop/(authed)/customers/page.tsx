import Link from "next/link";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  listCustomersForShop,
  type CustomerSort,
  type ShopCustomerListItem,
} from "@/lib/services/customer-crm";
import { getBangkokToday } from "@/lib/time/bangkok";
import { formatBaht } from "@/lib/baht";
import { PageHeader } from "@/components/layout/PageHeader";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import { Icon } from "@/components/ui/Icon";
import { CustomerListControls } from "./CustomerListControls";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ลูกค้า · Quego",
};

const PAGE_SIZE = 20;
const VALID_SORTS: Record<CustomerSort, true> = {
  recent: true,
  spend: true,
  visits: true,
  name: true,
};

function parseSort(raw: string | undefined): CustomerSort {
  return raw && raw in VALID_SORTS ? (raw as CustomerSort) : "recent";
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

type SearchParams = Promise<{ q?: string; sort?: string; page?: string }>;

export default async function ShopCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  const result = await listCustomersForShop(session.shopId, {
    q,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const today = getBangkokToday();
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="p-4 md:p-12 max-w-[960px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ฐานลูกค้า"
        title="ลูกค้า"
        description={
          q
            ? `ผลการค้นหา “${q}” · พบ ${result.total.toLocaleString("th-TH")} คน`
            : `ลูกค้าทั้งหมด ${result.total.toLocaleString("th-TH")} คน · ค้นหา ติดตาม และจองให้ลูกค้าได้จากที่นี่`
        }
        help={<TourHelpButton tourId="shop-customers" />}
      />

      <CustomerListControls q={q} sort={sort} />

      {result.customers.length === 0 ? (
        <EmptyState searching={q.length > 0} />
      ) : (
        <>
          <ul className="space-y-3">
            {result.customers.map((c) => (
              <CustomerCard key={c.phone} customer={c} today={today} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} q={q} sort={sort} />
        </>
      )}
    </div>
  );
}

// ----- Customer card ------------------------------------------------------

function CustomerCard({
  customer,
  today,
}: {
  customer: ShopCustomerListItem;
  today: string;
}) {
  const name = customer.displayName?.trim() || formatPhone(customer.phone);
  return (
    <li data-tour={TOUR_ANCHORS.customersCard}>
      <Link
        href={`/shop/customers/${customer.phone}`}
        className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-primary hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary-container font-display text-label-md font-bold text-on-secondary-container">
          {initials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-headline-sm text-on-surface">
              {name}
            </p>
            {customer.upcomingCount > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary">
                <Icon name="event_upcoming" size={12} className="shrink-0" />
                มีคิว {customer.upcomingCount}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            <Icon name="phone" size={13} className="shrink-0" />
            {formatPhone(customer.phone)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-label-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <Icon name="task_alt" size={13} className="shrink-0" />
              {customer.totalVisits} ครั้ง
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="payments" size={13} className="shrink-0" />
              {formatBaht(customer.lifetimeSpend)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="update" size={13} className="shrink-0" />
              {customer.lastCompletedVisit
                ? formatRelativeRecency(customer.lastCompletedVisit, today)
                : "ยังไม่เคยมา"}
            </span>
          </div>
        </div>

        <Icon
          name="chevron_right"
          className="shrink-0 text-on-surface-variant"
        />
      </Link>
    </li>
  );
}

// ----- Pagination ---------------------------------------------------------

function Pagination({
  page,
  totalPages,
  q,
  sort,
}: {
  page: number;
  totalPages: number;
  q: string;
  sort: CustomerSort;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort !== "recent") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/shop/customers?${qs}` : "/shop/customers";
  };

  const linkCls =
    "inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  return (
    <nav className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkCls}>
          <Icon name="chevron_left" size={18} />
          ก่อนหน้า
        </Link>
      ) : (
        <span />
      )}
      <span className="text-label-md text-on-surface-variant">
        หน้า {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkCls}>
          ถัดไป
          <Icon name="chevron_right" size={18} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

// ----- Empty state --------------------------------------------------------

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 md:p-12 text-center space-y-4">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary-container/40 text-on-secondary-container">
        <Icon name={searching ? "search_off" : "groups"} size={32} />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-headline-md text-on-surface">
          {searching ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีลูกค้า"}
        </h2>
        <p className="mx-auto max-w-md text-body-md text-on-surface-variant">
          {searching
            ? "ลองค้นหาด้วยชื่อหรือเบอร์โทรอื่น"
            : "ลูกค้าจะปรากฏที่นี่เมื่อมีการจองเข้ามาที่ร้านของคุณ"}
        </p>
      </div>
    </div>
  );
}

// ----- Formatting (local to this list view) -------------------------------

/** "How long since the customer last actually came" as a coarse Thai phrase. */
function formatRelativeRecency(ymd: string, todayYmd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const diffDays = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000,
  );
  if (diffDays <= 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";
  if (diffDays < 7) return `${diffDays} วันก่อน`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ก่อน`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนก่อน`;
  return `${Math.floor(diffDays / 365)} ปีก่อน`;
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/u);
  if (parts.length === 0 || parts[0] === "") return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
