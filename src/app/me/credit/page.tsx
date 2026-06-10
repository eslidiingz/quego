import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import {
  getLoyaltyBalance,
  listLoyaltyLedger,
  getOrCreateReferralCode,
} from "@/lib/services/loyalty";
import { absoluteUrl } from "@/lib/url";
import { CreditHistory } from "./CreditHistory";
import { ReferralCard } from "./ReferralCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "เครดิตของฉัน · queva",
};

export default async function MyCreditPage() {
  const session = await requireCustomerSession();

  // Each loyalty read lazily releases any now-eligible referrals first, so the
  // balance + history reflect freshly-earned rewards without a background job.
  const [{ balance }, entries, referralCode] = await Promise.all([
    getLoyaltyBalance(session.phone),
    listLoyaltyLedger(session.phone),
    getOrCreateReferralCode(session.phone),
  ]);

  const referralUrl = referralCode ? absoluteUrl(`/login?ref=${referralCode}`) : "";

  return (
    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <PageHeader
        eyebrow="คะแนนสะสม"
        title="เครดิตของฉัน"
        description="สะสมแต้มทุกครั้งที่ใช้บริการ และรับแต้มเพิ่มเมื่อชวนเพื่อนมาใช้ queva"
      />

      {/* Balance summary */}
      <section className="rounded-2xl bg-primary text-on-primary px-6 py-7 flex items-center gap-4">
        <span className="flex items-center justify-center size-14 rounded-full bg-on-primary/15">
          <Icon name="loyalty" size={30} />
        </span>
        <div>
          <p className="text-label-md opacity-90">แต้มสะสมทั้งหมด</p>
          <p className="font-display text-display-sm font-bold tabular-nums leading-tight">
            {balance.toLocaleString("th-TH")}{" "}
            <span className="text-headline-md font-semibold">แต้ม</span>
          </p>
        </div>
      </section>

      {referralUrl ? (
        <ReferralCard referralUrl={referralUrl} referralCode={referralCode} />
      ) : null}

      <CreditHistory entries={entries} />
    </div>
  );
}
