import { redirect } from "next/navigation";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { FlashToast } from "@/components/ui/FlashToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { getCustomerProfile } from "@/lib/services/customers";
import { getLineLinkStatus } from "@/lib/services/line-linking";
import { ProfileNameForm } from "./ProfileNameForm";
import { LinkLineCard } from "./LinkLineCard";
import { changeCustomerPinAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "โปรไฟล์ของฉัน · Quego",
};

type SearchParams = Promise<{ tab?: string; notice?: string }>;

function parseTab(raw: string | undefined): string | undefined {
  return raw === "notifications" || raw === "security" || raw === "personal"
    ? raw
    : undefined;
}

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireCustomerSession();
  const profile = await getCustomerProfile(session.customerId);
  if (!profile) {
    redirect("/login?notice=session-expired");
  }
  const { tab, notice } = await searchParams;
  const lineLink = await getLineLinkStatus(session.customerId);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <FlashToast notice={notice} />
      <PageHeader
        eyebrow="บัญชีของฉัน"
        title="โปรไฟล์"
        description="จัดการบัญชีและความปลอดภัยของคุณ"
      />

      <Tabs
        defaultTab={parseTab(tab)}
        tabs={[
          {
            id: "personal",
            label: "ข้อมูลส่วนตัว",
            content: (
              <ProfileNameForm name={profile.name} phone={profile.phone} />
            ),
          },
          {
            id: "notifications",
            label: "การแจ้งเตือน",
            content: <LinkLineCard linked={lineLink.linked} />,
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
