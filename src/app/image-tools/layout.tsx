import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "أدوات تحسين الصور الذكية - ضغط وإزالة الخلفية مجاناً | APDF",
  description:
    "اضغط صورك إلى الحجم المطلوب أو أزل الخلفية بالذكاء الاصطناعي داخل المتصفح. صورك لا تُرفع إلى خوادمنا.",
};

export default function ImageToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
