import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeroShell } from "@/components/auth/AuthHeroShell";
import { getCustomerLoginIntent } from "@/lib/auth/customer-session-server";
import { findCustomerByPhone } from "@/lib/services/customers";
import { CustomerSetupGate } from "./CustomerSetupGate";
import { VerifyPinForm } from "./VerifyPinForm";

export const metadata = {
  title: "รหัส PIN · quego",
};

export const dynamic = "force-dynamic";

/**
 * Step 2 of customer login. Reads the login intent cookie set by step 1,
 * then picks setup (no PIN yet — or no row at all) vs verify (PIN exists).
 * SRP: the page only orchestrates which form to show.
 */
export default async function CustomerPinPage() {
  const intent = await getCustomerLoginIntent();
  if (!intent) {
    redirect("/login?notice=session-expired");
  }

  const customer = await findCustomerByPhone(intent.phone);
  const mode: "setup" | "verify" =
    customer && customer.hasPin ? "verify" : "setup";

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
          ? "ตั้งรหัส PIN 6 หลักเพื่อใช้เข้าสู่ระบบในครั้งต่อไป"
          : "ใช้รหัส PIN เพื่อเข้าสู่ระบบ"
      }
      footer={
        <>
          ไม่ใช่เบอร์นี้?{" "}
          <Link
            href="/login"
            className="text-on-primary font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
          >
            กลับไปกรอกเบอร์ใหม่
          </Link>
        </>
      }
    >
      {mode === "setup" ? (
        <CustomerSetupGate phone={intent.phone} />
      ) : (
        <VerifyPinForm />
      )}
    </AuthHeroShell>
  );
}
