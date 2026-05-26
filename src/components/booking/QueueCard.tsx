import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";

export type QueueCardProps = {
  number: string;
  customerName: string;
  service: string;
  waitedMinutes?: number;
  status?: "standard" | "urgent" | "delayed";
  vip?: boolean;
  onCall?: () => void;
  onSkip?: () => void;
  callLabel?: string;
  skipLabel?: string;
  className?: string;
};

export function QueueCard({
  number,
  customerName,
  service,
  waitedMinutes,
  status = "standard",
  vip,
  onCall,
  onSkip,
  callLabel = "เรียกคิว",
  skipLabel = "เลื่อนคิว",
  className,
}: QueueCardProps) {
  const isUrgent = status === "urgent";
  const isDelayed = status === "delayed";
  return (
    <div
      className={cn(
        "relative rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all overflow-hidden",
        isUrgent
          ? "bg-surface border-2 border-secondary shadow-sm"
          : isDelayed
            ? "bg-surface-container-low border border-outline-variant opacity-80"
            : "bg-surface border border-outline-variant hover:bg-surface-container-low",
        className,
      )}
    >
      {isUrgent ? <span className="absolute left-0 top-0 h-full w-1.5 bg-secondary" /> : null}
      <div className="flex items-center gap-6">
        <div
          className={cn(
            "h-16 w-16 flex items-center justify-center rounded-2xl font-display font-bold text-display-lg-mobile leading-none",
            isUrgent
              ? "bg-secondary-fixed text-on-secondary-fixed"
              : isDelayed
                ? "bg-secondary-fixed/50 text-on-surface-variant"
                : "bg-surface-container-highest text-on-surface",
          )}
        >
          {number}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display text-headline-md text-on-surface">{customerName}</h4>
            {vip ? <Chip variant="vip" size="sm">VIP</Chip> : null}
            {isDelayed ? <Chip variant="delayed" size="sm">เลื่อนเวลา</Chip> : null}
          </div>
          <p className="text-body-md text-on-surface-variant">{service}</p>
          {typeof waitedMinutes === "number" ? (
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <Icon name="schedule" size={14} />
                รอมาแล้ว {waitedMinutes} นาที
              </span>
              {isUrgent ? (
                <span className="flex items-center gap-1 text-label-sm text-error font-bold">
                  <Icon name="priority_high" size={14} />
                  รอนานกว่าปกติ
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex gap-3">
        {onSkip ? (
          <Button
            variant={isUrgent ? "secondary" : "ghost"}
            rounded="xl"
            onClick={onSkip}
          >
            {skipLabel}
          </Button>
        ) : null}
        {onCall ? (
          <Button
            variant={isDelayed ? "secondary" : "primary"}
            rounded="xl"
            onClick={onCall}
          >
            {isDelayed ? "พร้อมเรียก" : callLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
