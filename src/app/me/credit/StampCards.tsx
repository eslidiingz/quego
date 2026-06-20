import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import type { CustomerStampCard } from "@/lib/services/promotions";

/**
 * SRP: render a customer's stamp cards (บัตรสะสมแต้ม) — one per shop promotion
 * they hold a positive balance in. Pure presentation; the cards (already
 * progress-resolved + sorted) are injected by the server page. Each shows the
 * rule, a progress bar toward the next reward, and a "พร้อมแลก" badge when the
 * balance covers a full reward block.
 */
export function StampCards({ cards }: { cards: CustomerStampCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-label-lg font-bold text-on-surface flex items-center gap-2">
        <Icon name="card_giftcard" size={20} className="text-primary" />
        บัตรสะสมแต้ม
      </h2>
      <ul className="space-y-3">
        {cards.map((card) => (
          <StampCardItem key={card.promotionId} card={card} />
        ))}
      </ul>
    </section>
  );
}

function StampCardItem({ card }: { card: CustomerStampCard }) {
  const eligible = card.redeemable >= 1;
  const shown = eligible ? card.requiredStamps : card.towardNext;
  const pct = Math.round((shown / card.requiredStamps) * 100);

  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-md text-on-surface-variant truncate">
            {card.shopHandle ? (
              <Link
                href={`/shops/${card.shopHandle}`}
                className="hover:text-primary transition-colors"
              >
                {card.shopName}
              </Link>
            ) : (
              card.shopName
            )}
          </p>
          <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight">
            {card.title}
          </h3>
        </div>
        {eligible ? (
          <Chip size="sm" variant="success">
            พร้อมแลก{card.redeemable > 1 ? ` ×${card.redeemable}` : ""}
          </Chip>
        ) : null}
      </div>

      <p className="text-body-md text-on-surface">
        ใช้บริการครบ{" "}
        <span className="font-bold text-primary tabular-nums">
          {card.requiredStamps}
        </span>{" "}
        ครั้ง รับ <span className="font-bold">{card.reward}</span>
      </p>

      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-label-md font-bold text-on-surface tabular-nums shrink-0">
          {shown}/{card.requiredStamps}
        </span>
      </div>

      {eligible ? (
        <p className="text-label-md text-success">
          ครบแล้ว! แจ้งร้านเพื่อรับสิทธิ์ได้เลย
        </p>
      ) : (
        <p className="text-label-md text-on-surface-variant">
          อีก {card.requiredStamps - card.towardNext} ครั้ง รับ {card.reward}
        </p>
      )}
    </li>
  );
}
