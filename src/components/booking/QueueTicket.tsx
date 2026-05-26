import { cn } from "@/lib/cn";
import { ProgressBar } from "../ui/ProgressBar";
import { Icon } from "../ui/Icon";

export type QueueTicketProps = {
  number: string;
  waitMinutes: number;
  remaining: number;
  progress: number;
  className?: string;
};

export function QueueTicket({
  number,
  waitMinutes,
  remaining,
  progress,
  className,
}: QueueTicketProps) {
  return (
    <div
      className={cn(
        "shadow-luxury rounded-xl bg-surface-container-lowest border border-outline-variant p-6 md:p-8 overflow-hidden relative",
        className,
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex flex-col">
          <span className="text-label-sm text-secondary uppercase tracking-tighter mb-1">
            หมายเลขคิวของคุณ
          </span>
          <div className="font-display font-bold text-display-lg-mobile md:text-display-lg text-primary leading-none">
            {number}
          </div>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-secondary/20">
          <div className="text-right">
            <span className="block text-label-sm text-on-surface-variant">รออีกประมาณ</span>
            <span className="block font-display text-headline-md text-secondary">
              {waitMinutes} นาที
            </span>
          </div>
          <div className="h-10 w-px bg-outline-variant" />
          <div className="text-right">
            <span className="block text-label-sm text-on-surface-variant">คิวที่เหลือ</span>
            <span className="block font-display text-headline-md text-primary">{remaining} คิว</span>
          </div>
        </div>
      </div>
      <ProgressBar
        value={progress}
        variant="gradient"
        size="lg"
        label="ความคืบหน้า"
        showValue
      />
      <div className="flex justify-between mt-4">
        {[
          { icon: "check_circle", label: "จองแล้ว", done: true },
          { icon: "hourglass_top", label: "รอเรียก", active: true },
          { icon: "content_cut", label: "ใช้บริการ" },
        ].map((step) => (
          <div
            key={step.label}
            className={cn(
              "flex flex-col items-center gap-1",
              step.active ? "text-primary font-bold" : "opacity-40",
            )}
          >
            <Icon name={step.icon} />
            <span className="text-label-sm">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
