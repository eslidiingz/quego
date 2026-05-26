import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { findApprovedShopByPhone } from "@/lib/services/shops";
import { getShopLoginIntent } from "@/lib/auth/shop-session-server";
import { SetupPinForm } from "./SetupPinForm";
import { VerifyPinForm } from "./VerifyPinForm";

export const metadata = {
  title: "รหัส PIN · LuxeQueue",
};

export const dynamic = "force-dynamic";

/**
 * Step 2 of shop login. Reads the login intent cookie set by step 1, then
 * picks setup (no PIN yet) vs verify (PIN exists) based on the live shop row.
 * SRP: the page only orchestrates which form to show — neither form knows
 * about the other.
 */
export default async function ShopPinPage() {
  const intent = await getShopLoginIntent();
  if (!intent) {
    redirect("/shop/login?notice=session-expired");
  }

  const shop = await findApprovedShopByPhone(intent.phone);
  if (!shop) {
    redirect("/shop/login?notice=session-expired");
  }

  const mode: "setup" | "verify" = shop.hasPin ? "verify" : "setup";

  return (
    <main className="min-h-screen w-full bg-background flex flex-col px-4 py-6 md:py-12">
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
              <Icon
                name={mode === "setup" ? "lock_reset" : "lock"}
                className="text-on-primary"
                size={32}
              />
            </div>
          </Link>
          <h1 className="font-display text-headline-lg text-primary">
            {mode === "setup" ? "ตั้งรหัส PIN ครั้งแรก" : "กรอกรหัส PIN"}
          </h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            {mode === "setup"
              ? `ตั้งรหัส PIN 6 หลักเพื่อใช้เข้าสู่ระบบของร้าน "${shop.name}" ในครั้งต่อไป`
              : `ใช้รหัส PIN ของร้าน "${shop.name}" เพื่อเข้าสู่ระบบ`}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-tinted p-6 md:p-8">
          {mode === "setup" ? <SetupPinForm /> : <VerifyPinForm />}
        </div>
        <p className="text-label-sm text-on-surface-variant text-center mt-6">
          ไม่ใช่ร้านนี้?{" "}
          <Link href="/shop/login" className="text-primary font-semibold hover:underline">
            กลับไปกรอกเบอร์ใหม่
          </Link>
        </p>
      </div>
    </main>
  );
}
