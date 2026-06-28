import { LandingNav } from "@/components/landing/LandingNav";
import { BusinessHero } from "@/components/landing/BusinessHero";
import { BusinessValueProps } from "@/components/landing/BusinessValueProps";
import { BusinessHowItWorks } from "@/components/landing/BusinessHowItWorks";
import { BusinessCta } from "@/components/landing/BusinessCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quego.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Quego สำหรับร้าน — เปิดรับจองคิวออนไลน์ ฟรี ใช้ทันที",
  description:
    "ระบบจัดการคิวและรับจองออนไลน์สำหรับทุกธุรกิจที่มีลูกค้าต่อคิว สมัครฟรี ใช้ได้ทันที ลดงานรับโทร ลดคิวหลุด เตือนลูกค้าอัตโนมัติ",
  keywords: [
    "ระบบจองคิวร้าน",
    "เปิดร้านรับจองคิว",
    "โปรแกรมจัดการคิว",
    "ระบบจองคิวร้านเสริมสวย",
    "รับจองออนไลน์ฟรี",
    "ระบบนัดหมายออนไลน์",
    "quego สำหรับร้าน",
  ],
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Quego",
    title: "Quego สำหรับร้าน — เปิดรับจองคิวออนไลน์ ฟรี ใช้ทันที",
    description:
      "ระบบจัดการคิวและรับจองออนไลน์สำหรับทุกธุรกิจที่มีลูกค้าต่อคิว สมัครฟรี ใช้ได้ทันที ลดงานรับโทร ลดคิวหลุด",
    url: `${SITE_URL}/business`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Quego สำหรับร้าน — เปิดรับจองคิวออนไลน์ ฟรี ใช้ทันที",
    description:
      "ระบบจัดการคิวและรับจองออนไลน์สำหรับทุกธุรกิจที่มีลูกค้าต่อคิว สมัครฟรี ใช้ได้ทันที",
  },
};

/**
 * `/business` — the supply-side landing page for shop owners. Mirrors the
 * customer home's chrome (LandingNav + LandingFooter) but every section speaks
 * to an owner: hero → value props → how-it-works → closing CTA. Public (not
 * guarded in proxy.ts, like /shops/*).
 */
export default function BusinessPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <LandingNav />
      <BusinessHero />
      <div className="flex-1">
        <BusinessValueProps />
        <BusinessHowItWorks />
        <BusinessCta />
      </div>
      <LandingFooter />
    </main>
  );
}
