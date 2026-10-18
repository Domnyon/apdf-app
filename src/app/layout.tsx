import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  description: "أدوات مجانية وسريعة لمعالجة وتعديل ملفات PDF مباشرة من جهازك: دمج، تقسيم، ضغط، وتحويل بأمان تام وبدون رفع ملفاتك لأي خادم.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="w-full max-w-full overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full max-w-full overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
