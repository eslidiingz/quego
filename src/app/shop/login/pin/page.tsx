import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeroShell } from "@/components/auth/AuthHeroShell";
import { findShopByOwnerPhone } from "@/lib/services/shops";
import { getShopLoginIntent } from "@/lib/auth/shop-session-server";
import { isPhoneVerified } from "@/lib/auth/phone-verification-server";
import { ShopSetupGate } from "./ShopSetupGate";
import { VerifyPinForm } from "./VerifyPinForm";

export const metadata = {
  title: "รหัส PIN · Quego",
};

export const dynamic = "force-dynamic";

/**
 * Step 2 of shop login. Reads the login intent cookie set by step 1, then
 * picks setup (no PIN yet) vs verify (PIN exists) based on the live shop row.
 *
 * Audit M8: a phone with no shop also lands here (shopId null) and gets the
 * verify form, which can never succeed. The page shows the TYPED phone in full,
 * never the shop name, so it reveals nothing the visitor didn't enter — and the
 * owner can spot a mistyped number and use "เปลี่ยนเบอร์".
 * SRP: the page only orchestrates which form to show — neither form knows
 * about the other.
 */
export default async function ShopPinPage() {
  const intent = await getShopLoginIntent();
  if (!intent) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  const shop = intent.shopId ? await findShopByOwnerPhone(intent.phone) : null;
  // No shop (or it went away) → the verify form; it fails like a wrong PIN.
  const mode: "setup" | "verify" = shop && !shop.hasPin ? "setup" : "verify";
  // Fresh from registration the OTP proof is still valid — skip a second OTP.
  const alreadyVerified =
    mode === "setup" ? await isPhoneVerified(intent.phone) : false;

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
          ? `ตั้งรหัส PIN 6 หลักสำหรับเบอร์ ${intent.phone} เพื่อใช้เข้าสู่ระบบร้านในครั้งต่อไป`
          : `กรอกรหัส PIN ของเบอร์ ${intent.phone} เพื่อเข้าสู่ระบบร้าน`
      }
      footer={
        <>
          เบอร์ไม่ถูกต้อง?{" "}
          <Link
            href="/login?tab=shop"
            className="text-on-primary font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
          >
            เปลี่ยนเบอร์
          </Link>
        </>
      }
    >
      {mode === "setup" ? (
        <ShopSetupGate
          phone={intent.phone}
          alreadyVerified={alreadyVerified}
        />
      ) : (
        <VerifyPinForm />
      )}
    </AuthHeroShell>
  );
}
