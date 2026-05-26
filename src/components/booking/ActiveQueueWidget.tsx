import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";
import { ProgressBar } from "../ui/ProgressBar";

export type ActiveQueueWidgetProps = {
  position: string;
  shopName: string;
  queuesAhead: number;
  progress: number;
  onClose?: () => void;
  className?: string;
};

export function ActiveQueueWidget({
  position,
  shopName,
  queuesAhead,
  progress,
  onClose,
  className,
}: ActiveQueueWidgetProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest border-2 border-secondary rounded-2xl p-4 shadow-luxury w-72 md:w-80 flex gap-4 glass-card",
        className,
      )}
    >
      <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gold-shimmer flex flex-col items-center justify-center text-white">
        <span className="text-label-sm font-bold opacity-80">ลำดับที่</span>
        <span className="text-2xl font-bold font-display">{position}</span>
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h6 className="font-display text-base text-on-surface leading-tight truncate">
            {shopName}
          </h6>
          {onClose ? (
            <button
              onClick={onClose}
              aria-label="ปิด"
              className="text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
        </div>
        <p className="text-label-sm text-on-surface-variant mb-2">
          อีก {queuesAhead} คิวจะถึงคุณ
        </p>
        <ProgressBar value={progress} size="sm" />
      </div>
    </div>
  );
}
