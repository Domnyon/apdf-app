import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteToolLinks from "@/components/SiteToolLinks";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APDF | أدوات تعديل وتحويل ملفات PDF أونلاين مجاناً",
  description:
    "منصة apdf.app توفر أدوات للتعامل مع ملفات PDF والصور، مع اختلاف طريقة المعالجة بحسب الأداة المستخدمة.",
  verification: {
    google: "XFc5Sj6H1B-cq88H5qoysOiUp9kxAkMvdrqZH7o4bbQ",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce-based CSP requires request-time rendering so Next.js can nonce its scripts.
  await headers();

  return (
    <html lang="ar" dir="rtl" className="w-full max-w-full overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full max-w-full overflow-x-hidden`}
      >
        <SiteToolLinks />
        {children}
      </body>
    </html>
  );
}
