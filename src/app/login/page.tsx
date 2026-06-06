import { FlashToast } from "@/components/ui/FlashToast";
import { AuthHeroShell } from "@/components/auth/AuthHeroShell";
import { ShopLoginPhoneForm } from "@/app/shop/login/ShopLoginPhoneForm";
import { LoginTabs, type LoginTabKey } from "./LoginTabs";
import { CustomerLoginForm } from "./CustomerLoginForm";

export const metadata = {
  title: "เข้าสู่ระบบ · queva",
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
    <>
      <FlashToast notice={notice} />
      <AuthHeroShell
        title={
          <h1 className="font-display font-semibold text-[34px] leading-none tracking-tight text-on-primary">
            queva<span className="text-secondary">.</span>
          </h1>
        }
        subtitle="เข้าสู่ระบบเพื่อจัดการคิวของคุณ"
        footer={`© ${new Date().getFullYear()} queva · Premium Queue Concierge`}
      >
        <LoginTabs active={active} />
        {active === "customer" ? <CustomerLoginForm /> : <ShopLoginPhoneForm />}
      </AuthHeroShell>
    </>
  );
}
