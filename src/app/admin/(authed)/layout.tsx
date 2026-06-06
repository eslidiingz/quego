import { requireAdminSession } from "@/lib/auth/session-server";
import { AdminShell } from "@/components/admin/AdminShell";
import { countShopsByStatus } from "@/lib/services/shops";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  // Backlog count for the nav badge + baseline cursor for the live notifier.
  // force-dynamic + the notifier's router.refresh() keep the badge current as
  // registrations arrive and as the admin approves/rejects them.
  const counts = await countShopsByStatus();
  const initialSinceIso = new Date().toISOString();
  return (
    <AdminShell
      adminName={session.name}
      adminPhone={session.phone}
      initialSinceIso={initialSinceIso}
      pendingCount={counts.pending}
    >
      {children}
    </AdminShell>
  );
}
