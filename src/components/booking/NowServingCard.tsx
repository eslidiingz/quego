import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";

export type NowServingCardProps = {
  number: string;
  statusLabel?: string;
  onCallNext?: () => void;
  onNotify?: () => void;
  className?: string;
};

export function NowServingCard({
  number,
  statusLabel = "กำลังดำเนินการ",
  onCallNext,
  onNotify,
  className,
}: NowServingCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl border border-outline-variant p-8 relative overflow-hidden flex flex-col justify-between shadow-gold-glow min-h-[240px]",
        className,
      )}
    >
      <div className="absolute top-0 right-0 p-6">
        <Icon name="record_voice_over" size={72} className="text-secondary-container opacity-30" />
      </div>
      <div>
        <h3 className="text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
          <Icon name="campaign" className="text-primary" />
          กำลังให้บริการหมายเลข
        </h3>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="font-display font-bold text-display-lg text-primary leading-none">
            {number}
          </span>
          <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-lg text-label-sm uppercase animate-pulse-subtle">
            {statusLabel}
          </span>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <Button
          variant="primary"
          size="xl"
          rounded="xl"
          fullWidth
          onClick={onCallNext}
          iconLeft={<Icon name="skip_next" />}
        >
          เรียกคิวถัดไป
        </Button>
        <Button
          variant="secondary"
          size="xl"
          rounded="xl"
          onClick={onNotify}
          aria-label="แจ้งเตือน"
        >
          <Icon name="notifications_active" />
        </Button>
      </div>
    </div>
  );
}
