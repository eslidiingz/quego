import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { FlashToast } from "@/components/ui/FlashToast";
import { ShopLoginPhoneForm } from "@/app/shop/login/ShopLoginPhoneForm";
import { LoginTabs, type LoginTabKey } from "./LoginTabs";
import { CustomerLoginForm } from "./CustomerLoginForm";

export const metadata = {
  title: "เข้าสู่ระบบ · LuxeQueue",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string; notice?: string }>;

function resolveTab(raw: string | undefined): LoginTabKey {
  return raw === "shop" ? "shop" : "customer";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab, notice } = await searchParams;
  const active = resolveTab(tab);

  return (
    <main className="min-h-screen w-full bg-background flex flex-col px-4 py-6 md:py-12">
      <FlashToast notice={notice} />
      <div className="w-full max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าหลัก
        </Link>
      </div>
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" aria-label="กลับหน้าหลัก">
            <div className="w-16 h-16 rounded-2xl bg-luxury-gradient flex items-center justify-center mb-4 shadow-luxury hover:scale-105 transition-transform">
              <Icon name="spa" className="text-on-primary" size={32} />
            </div>
          </Link>
          <h1 className="font-display text-headline-lg text-primary">
            LuxeQueue
          </h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            เข้าสู่ระบบเพื่อจัดการคิวของคุณ
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-tinted p-6 md:p-8">
          <LoginTabs active={active} />
          {active === "customer" ? <CustomerLoginForm /> : <ShopLoginPhoneForm />}
        </div>
        <p className="text-label-sm text-on-surface-variant text-center mt-6">
          © {new Date().getFullYear()} LuxeQueue Premium Concierge
        </p>
      </div>
    </main>
  );
}
