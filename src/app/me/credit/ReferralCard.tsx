import { CopyField } from "@/components/ui/CopyField";
import { Icon } from "@/components/ui/Icon";
import { REFERRAL_REWARD_POINTS } from "@/lib/loyalty/loyalty-credit";

/**
 * SRP: present the customer's referral toolkit — their share link (copyable),
 * the raw code, and a plain-Thai explainer of the 3-day hold. Pure
 * presentation: the absolute referral URL + code are resolved on the server
 * page and handed in as props (this renders, it does not fetch). Mirrors the
 * shop ShareTools / LinkLineCard cards.
 */
export function ReferralCard({
  referralUrl,
  referralCode,
}: {
  referralUrl: string;
  referralCode: string;
}) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6 space-y-4">
      <div>
        <h2 className="text-label-lg font-bold text-on-surface mb-1 flex items-center gap-2">
          <Icon name="group_add" size={20} className="text-primary" />
          แนะนำเพื่อน รับแต้ม
        </h2>
        <p className="text-label-md text-on-surface-variant">
          แชร์ลิงก์นี้ให้เพื่อน เมื่อเพื่อนสมัครและใช้บริการครบ คุณจะได้รับ{" "}
          {REFERRAL_REWARD_POINTS} แต้ม
        </p>
      </div>

      <CopyField
        value={referralUrl}
        id="referral-url"
        label="ลิงก์แนะนำเพื่อนของคุณ"
      />

      {referralCode ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low border border-outline-variant px-4 py-3">
          <span className="text-label-md text-on-surface-variant">
            รหัสแนะนำ
          </span>
          <span className="font-display text-headline-md font-bold tracking-widest text-on-surface tabular-nums">
            {referralCode}
          </span>
        </div>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl bg-tertiary-container text-on-tertiary-container px-4 py-3.5">
        <Icon name="schedule" size={20} className="shrink-0 mt-0.5" />
        <p className="text-label-md">
          เครดิตจะเข้าหลังเพื่อนใช้บริการและครบ 3 วัน
        </p>
      </div>
    </section>
  );
}
