import { cn } from "@/lib/cn";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";

export type SidebarItem = {
  key: string;
  label: string;
  icon: string;
};

export type SidebarNavProps = {
  items: SidebarItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  profileName?: string;
  profileTier?: string;
  profileAvatar?: string;
  className?: string;
};

export function SidebarNav({
  items,
  activeKey,
  onChange,
  profileName = "Elite Shop",
  profileTier = "Premium Tier",
  profileAvatar,
  className,
}: SidebarNavProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 left-0 bg-surface-container-low border-r border-outline-variant w-80 rounded-r-xl shadow-md z-40",
        className,
      )}
    >
      <div className="px-8 py-10 flex items-center gap-3">
        <Icon name="spa" className="text-primary" size={36} />
        <span className="font-display font-bold text-headline-md text-primary tracking-tight">
          LuxeQueue
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 mx-2 py-3 mb-6 bg-surface-container-high rounded-xl">
        <Avatar
          src={profileAvatar}
          initials={profileName.slice(0, 2).toUpperCase()}
          size="lg"
          ring="primary"
        />
        <div className="min-w-0">
          <p className="text-label-md text-on-surface font-bold truncate">{profileName}</p>
          <p className="text-xs text-on-surface-variant">{profileTier}</p>
          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">
            Active
          </span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onChange?.(item.key)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-full transition-all text-left mx-2",
                active
                  ? "bg-secondary-container text-on-secondary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              <Icon name={item.icon} />
              <span className="text-label-md">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
