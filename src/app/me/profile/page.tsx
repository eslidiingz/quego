import { redirect } from "next/navigation";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { getCustomerProfile } from "@/lib/services/customers";
import { ProfileNameForm } from "./ProfileNameForm";
import { changeCustomerPinAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "โปรไฟล์ของฉัน · queva",
};

export default async function CustomerProfilePage() {
  const session = await requireCustomerSession();
  const profile = await getCustomerProfile(session.customerId);
  if (!profile) {
    redirect("/login?notice=session-expired");
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-stack-lg space-y-stack-lg">
      <header className="space-y-2">
        <p className="text-label-md text-secondary uppercase tracking-widest">
          บัญชีของฉัน
        </p>
        <h1 className="font-display text-headline-lg text-on-background">
          โปรไฟล์
        </h1>
        <p className="text-body-md text-on-surface-variant">
          จัดการชื่อที่แสดงและรหัส PIN สำหรับเข้าสู่ระบบ
        </p>
      </header>

      <ProfileNameForm name={profile.name} phone={profile.phone} />

      <ChangePinForm action={changeCustomerPinAction} />
    </div>
  );
}
