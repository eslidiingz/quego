import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";

export type TopAppBarProps = {
  title?: string;
  showLogo?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
};

export function TopAppBar({
  title = "LuxeQueue",
  showLogo = true,
  onBack,
  rightSlot,
  className,
}: TopAppBarProps) {
  return (
    <header
      className={cn(
        "w-full top-0 sticky bg-surface shadow-sm flex items-center justify-between h-16 px-4 md:px-12 z-50",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-primary"
            aria-label="ย้อนกลับ"
          >
            <Icon name="arrow_back" />
          </button>
        ) : showLogo ? (
          <Icon name="spa" className="text-primary" size={32} />
        ) : null}
        <h1 className="font-display font-bold text-display-lg-mobile text-primary tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4">{rightSlot}</div>
    </header>
  );
}
