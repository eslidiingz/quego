import { requireAdminSession } from "@/lib/auth/session-server";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  return (
    <AdminShell adminName={session.name} adminPhone={session.phone}>
      {children}
    </AdminShell>
  );
}
