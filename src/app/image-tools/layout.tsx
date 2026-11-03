import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ضاغط الصور الذكي - تصغير حجم الصور مجاناً | APDF",
  description:
    "اضغط صورة واحدة أو مجموعة صور إلى الحجم المطلوب، وتحكم بالجودة والأبعاد. تتم المعالجة داخل المتصفح دون رفع صورك.",
};

export default function ImageToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
