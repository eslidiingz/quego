import type { Metadata } from "next";
import { Sora, Anuphan } from "next/font/google";
import "./globals.css";

/**
 * queva brand typography:
 * - Sora — Latin display / numerals (logo, stat numbers, queue tickets, micro-labels).
 * - Anuphan — Thai-designed family for all prose and Thai headings.
 *
 * Both bind to CSS variables consumed by the `--font-*` design tokens in
 * globals.css. Sora has no Thai glyphs, so where `--font-display` leads with
 * Sora, Thai characters fall through to Anuphan per-glyph (keeps mixed-script
 * lines aligned, satisfies the Thai-glyph-font rule).
 */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "queva — ไม่ต้องรอเก้อ แค่กดจอง",
  description:
    "จองคิวร้านบริการความงามและสุขภาพทั่วไทย ดูคิวเรียลไทม์ กดจองล่วงหน้า ไม่ต้องไปนั่งรอ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${sora.variable} ${anuphan.variable} h-full antialiased`}
    >
      <head>
        {/* Material Symbols is an icon font; next/font subsetting would strip glyphs.
            App Router renders this in <head> correctly — the lint rule is a Pages-Router heuristic. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
