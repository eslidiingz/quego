import { cn } from "@/lib/cn";

export type BottomNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

export type BottomNavBarProps = {
  items: BottomNavItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  className?: string;
};

export function BottomNavBar({ items, activeKey, onChange, className }: BottomNavBarProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-surface border-t border-outline-variant shadow-[0_-4px_10px_rgba(0,0,0,0.05)] lg:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            onClick={() => onChange?.(item.key)}
            className={cn(
              "flex flex-col items-center justify-center transition-all px-4 py-1 min-w-[64px]",
              active
                ? "bg-primary-container text-on-primary-container rounded-2xl"
                : "text-on-surface-variant hover:text-primary",
            )}
          >
            {item.icon}
            <span className="text-label-sm">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
