import { PageHeader } from "@/components/layout/PageHeader";
import { FlashToast } from "@/components/ui/FlashToast";
import { requireAdminSession } from "@/lib/auth/session-server";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "บัญชีของฉัน · Quego Admin",
};

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [session, { notice }] = await Promise.all([
    requireAdminSession(),
    searchParams,
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[720px] mx-auto w-full space-y-stack-md">
      <FlashToast notice={notice} />
      <PageHeader
        eyebrow="บัญชีผู้ดูแล"
        title="บัญชีของฉัน"
        description={`เข้าสู่ระบบในชื่อ ${session.name} (${session.phone})`}
      />
      <ChangePasswordForm />
    </div>
  );
}
