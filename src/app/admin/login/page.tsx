import { AuthHeroShell } from "@/components/auth/AuthHeroShell";
import { LoginForm } from "./LoginForm";
import { FlashToast } from "@/components/ui/FlashToast";

export const metadata = {
  title: "เข้าสู่ระบบผู้ดูแล · quego",
};

type SearchParams = Promise<{ next?: string; notice?: string }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, notice } = await searchParams;
  const safeNext =
    typeof next === "string" && next.startsWith("/admin") ? next : undefined;

  return (
    <>
      <FlashToast notice={notice} />
      <AuthHeroShell
        icon="shield_person"
        eyebrow="ผู้ดูแลระบบ"
        title={
          <h1 className="font-display font-semibold text-[34px] leading-none tracking-tight text-on-primary">
            quego<span className="text-secondary">.</span>
          </h1>
        }
        subtitle="แผงควบคุมสำหรับทีมงาน quego เท่านั้น"
        footer={`© ${new Date().getFullYear()} quego · Premium Queue Concierge`}
      >
        <LoginForm next={safeNext} />
      </AuthHeroShell>
    </>
  );
}
