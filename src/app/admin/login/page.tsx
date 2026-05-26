import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { LoginForm } from "./LoginForm";
import { FlashToast } from "@/components/ui/FlashToast";

export const metadata = {
  title: "เข้าสู่ระบบผู้ดูแล · LuxeQueue",
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
    <main className="min-h-screen w-full bg-background flex flex-col px-4 py-6 md:py-12">
      <FlashToast notice={notice} />
      <div className="w-full max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าหลัก
        </Link>
      </div>
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" aria-label="กลับหน้าหลัก">
            <div className="w-16 h-16 rounded-2xl bg-luxury-gradient flex items-center justify-center mb-4 shadow-luxury hover:scale-105 transition-transform">
              <Icon name="spa" className="text-on-primary" size={32} />
            </div>
          </Link>
          <h1 className="font-display text-headline-lg text-primary">
            LuxeQueue Admin
          </h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            สำหรับผู้ดูแลระบบเท่านั้น
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-tinted p-6 md:p-8">
          <LoginForm next={safeNext} />
        </div>
        <p className="text-label-sm text-on-surface-variant text-center mt-6">
          © {new Date().getFullYear()} LuxeQueue Premium Concierge
        </p>
      </div>
    </main>
  );
}
