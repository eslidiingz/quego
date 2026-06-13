import { Icon } from "@/components/ui/Icon";
import type { LedgerEntry, LedgerKind } from "@/lib/services/loyalty";

/**
 * SRP: render a customer's loyalty ledger newest-first. Pure presentation —
 * the entries (already release-resolved + sorted) are injected by the server
 * page. Each kind gets a Thai label + icon; the date is formatted in Bangkok
 * time and points carry the "แต้ม" unit.
 */

const KIND_LABEL: Record<LedgerKind, string> = {
  earn: "ใช้บริการเสร็จสิ้น",
  referral: "แต้มจากการแนะนำเพื่อน",
  adjust: "ปรับปรุงแต้ม",
};

const KIND_ICON: Record<LedgerKind, string> = {
  earn: "check_circle",
  referral: "group_add",
  adjust: "tune",
};

/** Format an ISO timestamp as a Bangkok-local Thai date, e.g. "9 มิ.ย. 2569". */
function formatBangkokDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function CreditHistory({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="border-2 border-dashed border-outline-variant rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-3 bg-surface-container-lowest">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-container-low text-on-surface-variant">
          <Icon name="loyalty" size={28} />
        </span>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          ยังไม่มีรายการแต้ม — เมื่อคุณใช้บริการเสร็จสิ้นหรือเพื่อนที่คุณแนะนำใช้บริการ
          แต้มจะปรากฏที่นี่
        </p>
      </div>
    );
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6">
      <h2 className="text-label-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <Icon name="history" size={20} className="text-primary" />
        ประวัติแต้ม
      </h2>
      <ul className="divide-y divide-outline-variant">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="shrink-0 flex items-center justify-center size-9 rounded-full bg-surface-container-low text-primary">
              <Icon name={KIND_ICON[entry.kind]} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-md text-on-surface truncate">
                {entry.note ?? KIND_LABEL[entry.kind]}
              </p>
              <p className="text-label-md text-on-surface-variant">
                {formatBangkokDate(entry.createdAt)}
              </p>
            </div>
            <span
              className={`shrink-0 text-label-lg font-bold tabular-nums ${
                entry.amount < 0 ? "text-error" : "text-success"
              }`}
            >
              {entry.amount > 0 ? "+" : ""}
              {entry.amount.toLocaleString("th-TH")} แต้ม
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
