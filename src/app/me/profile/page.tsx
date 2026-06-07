import { redirect } from "next/navigation";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
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
    <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <PageHeader
        eyebrow="บัญชีของฉัน"
        title="โปรไฟล์"
        description="จัดการบัญชีและความปลอดภัยของคุณ"
      />

      <Tabs
        tabs={[
          {
            id: "personal",
            label: "ข้อมูลส่วนตัว",
            content: (
              <ProfileNameForm name={profile.name} phone={profile.phone} />
            ),
          },
          {
            id: "security",
            label: "ความปลอดภัย",
            content: <ChangePinForm action={changeCustomerPinAction} />,
          },
        ]}
      />
    </div>
  );
}
