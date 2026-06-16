import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeroShell } from "@/components/auth/AuthHeroShell";
import { findShopByOwnerPhone } from "@/lib/services/shops";
import { getShopLoginIntent } from "@/lib/auth/shop-session-server";
import { SetupPinForm } from "./SetupPinForm";
import { VerifyPinForm } from "./VerifyPinForm";

export const metadata = {
  title: "รหัส PIN · quego",
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
    redirect("/login?tab=shop&notice=session-expired");
  }

  const shop = await findShopByOwnerPhone(intent.phone);
  if (!shop) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  const mode: "setup" | "verify" = shop.hasPin ? "verify" : "setup";

  return (
    <AuthHeroShell
      icon={mode === "setup" ? "lock_reset" : "lock"}
      title={
        <h1 className="font-headline font-bold text-headline-lg leading-tight tracking-tight text-on-primary">
          {mode === "setup" ? "ตั้งรหัส PIN ครั้งแรก" : "กรอกรหัส PIN"}
        </h1>
      }
      subtitle={
        mode === "setup"
          ? `ตั้งรหัส PIN 6 หลักเพื่อใช้เข้าสู่ระบบของร้าน "${shop.name}" ในครั้งต่อไป`
          : `ใช้รหัส PIN ของร้าน "${shop.name}" เพื่อเข้าสู่ระบบ`
      }
      footer={
        <>
          ไม่ใช่ร้านนี้?{" "}
          <Link
            href="/login?tab=shop"
            className="text-on-primary font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
          >
            กลับไปกรอกเบอร์ใหม่
          </Link>
        </>
      }
    >
      {mode === "setup" ? <SetupPinForm /> : <VerifyPinForm />}
    </AuthHeroShell>
  );
}
