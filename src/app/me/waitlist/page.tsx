import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { listWaitlistForCustomer, type WaitlistItem } from "@/lib/services/waitlist";
import { formatBookingDate } from "@/lib/line/format";
import { CancelWaitlistButton } from "./CancelWaitlistButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "รายการรอคิว · queva",
};

export default async function MyWaitlistPage() {
  const session = await requireCustomerSession();
  const entries = await listWaitlistForCustomer(session.phone);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <PageHeader
        eyebrow="แจ้งเตือนคิวว่าง"
        title="รายการรอคิว"
        description="ร้านที่คุณกำลังรอคิวว่างอยู่ เราจะแจ้งเตือนในแอป (และทาง LINE ถ้าเชื่อมต่อไว้) ทันทีที่มีคิวว่าง"
      />

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 text-center space-y-3">
          <span className="inline-flex items-center justify-center size-14 rounded-full bg-surface-container mx-auto">
            <Icon
              name="notifications_active"
              size={28}
              className="text-on-surface-variant"
            />
          </span>
          <h2 className="font-display text-headline-md text-on-surface">
            ยังไม่มีรายการรอ
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
            ถ้าร้านไหนคิวเต็มในวันที่ต้องการ กด “แจ้งเตือนเมื่อมีคิวว่าง”
            ในหน้าจองได้เลย แล้วรายการจะมาแสดงที่นี่
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-primary text-on-primary font-bold text-label-md hover:opacity-90 transition-opacity"
          >
            <Icon name="search" size={18} />
            ค้นหาร้าน
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <WaitlistCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WaitlistCard({ entry }: { entry: WaitlistItem }) {
  const isNotified = entry.status === "notified";
  return (
    <li className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-headline-sm text-on-surface truncate">
            {entry.shopName}
          </h3>
          <p className="text-label-md text-on-surface-variant mt-0.5">
            {entry.serviceName}
            {entry.staffName ? ` · ${entry.staffName}` : ""}
          </p>
        </div>
        <span
          className={
            isNotified
              ? "shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/12 text-primary px-2.5 py-1 text-label-sm font-semibold"
              : "shrink-0 inline-flex items-center gap-1 rounded-full bg-surface-container-high text-on-surface-variant px-2.5 py-1 text-label-sm font-semibold"
          }
        >
          <Icon name={isNotified ? "notifications_active" : "hourglass_empty"} size={14} />
          {isNotified ? "มีคิวว่าง!" : "กำลังรอ"}
        </span>
      </div>

      <div className="flex items-center gap-2 text-body-md text-on-surface">
        <Icon name="event" size={18} className="text-on-surface-variant" />
        วันที่ {formatBookingDate(entry.requestedDate)}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {isNotified ? (
          <Link
            href={entry.bookPath}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-primary text-on-primary font-bold text-label-md hover:opacity-90 transition-opacity"
          >
            <Icon name="event_available" size={18} />
            จองเลย
          </Link>
        ) : null}
        <div className={isNotified ? "flex-1 flex" : "w-full flex"}>
          <CancelWaitlistButton entryId={entry.id} />
        </div>
      </div>
    </li>
  );
}
